import logger from '../utils/logger.js';
import priceCache from './priceCache.js';
import { getPortfolioSnapshotCollection } from '../models/PortfolioSnapshot.js';
import type { NormalizedPosition } from '../types/snapshot.types.js';

export interface WorkerStats {
  lastRun?: Date;
  nextRun?: Date;
  uniqueSymbols: number;
  pricesUpdated: number;
  errors: number;
  isRunning: boolean;
}

class PriceUpdateWorker {
  private interval: NodeJS.Timeout | null = null;
  private updateIntervalMs: number;
  private isRunning: boolean = false;
  private stats: WorkerStats = {
    uniqueSymbols: 0,
    pricesUpdated: 0,
    errors: 0,
    isRunning: false,
  };

  constructor(updateIntervalMinutes: number = 2) {
    this.updateIntervalMs = updateIntervalMinutes * 60 * 1000;
    logger.info('PriceUpdateWorker created', {
      updateInterval: `${updateIntervalMinutes} minutes`,
    });
  }

  /**
   * Start the worker
   */
  start(): void {
    if (this.interval) {
      logger.warn('Price update worker is already running');
      return;
    }

    logger.info('Starting price update worker');

    // Run immediately on start
    this.runUpdate().catch((error) => {
      logger.error('Initial price update failed', { error });
    });

    // Schedule recurring updates
    this.interval = setInterval(() => {
      this.runUpdate().catch((error) => {
        logger.error('Scheduled price update failed', { error });
      });
    }, this.updateIntervalMs);

    logger.info('Price update worker started successfully');
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.interval) {
      logger.warn('Price update worker is not running');
      return;
    }

    clearInterval(this.interval);
    this.interval = null;
    logger.info('Price update worker stopped');
  }

  /**
   * Get worker status and statistics
   */
  getStats(): WorkerStats {
    return {
      ...this.stats,
      nextRun: this.interval && this.stats.lastRun
        ? new Date(this.stats.lastRun.getTime() + this.updateIntervalMs)
        : undefined,
    };
  }

  /**
   * Force run an update (can be called manually)
   */
  async forceUpdate(): Promise<void> {
    logger.info('Force update requested');
    await this.runUpdate();
  }

  /**
   * Check if we should update (only during market hours)
   * Monday-Friday, 9 AM - 6 PM (European market hours)
   */
  private shouldUpdate(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Skip weekends
    if (day === 0 || day === 6) {
      logger.debug('Skipping update - weekend');
      return false;
    }

    // Skip outside market hours (9 AM - 6 PM)
    if (hour < 9 || hour >= 18) {
      logger.debug('Skipping update - outside market hours');
      return false;
    }

    return true;
  }

  /**
   * Main update logic
   */
  private async runUpdate(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Price update already in progress, skipping this cycle');
      return;
    }

    // Check if we should update based on market hours
    if (!this.shouldUpdate()) {
      return;
    }

    this.isRunning = true;
    this.stats.isRunning = true;
    const startTime = Date.now();

    logger.info('Starting price update cycle');

    try {
      // Get all unique symbols from all portfolios
      const symbols = await this.collectUniqueSymbols();
      this.stats.uniqueSymbols = symbols.length;

      if (symbols.length === 0) {
        logger.info('No symbols to update');
        this.stats.lastRun = new Date();
        return;
      }

      logger.info(`Updating prices for ${symbols.length} unique symbols`);

      // Refresh prices (this will fetch from API and update cache)
      const updates = await priceCache.refreshPrices(symbols);
      this.stats.pricesUpdated = updates.size;

      // Log significant price changes (> 2%)
      let significantChanges = 0;
      for (const [symbol, update] of updates.entries()) {
        if (update.percentChange && Math.abs(update.percentChange) > 2) {
          logger.info(`Significant price change detected`, {
            symbol,
            oldPrice: update.oldPrice,
            newPrice: update.newPrice,
            change: `${update.percentChange.toFixed(2)}%`,
          });
          significantChanges++;
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Price update cycle completed', {
        symbols: symbols.length,
        updated: updates.size,
        significantChanges,
        duration: `${duration}ms`,
      });

      this.stats.lastRun = new Date();
      this.stats.errors = 0;
    } catch (error) {
      logger.error('Price update cycle failed', { error });
      this.stats.errors++;
    } finally {
      this.isRunning = false;
      this.stats.isRunning = false;
    }
  }

  /**
   * Collect all unique symbols from all portfolio snapshots
   * This extracts symbols from the latest snapshot of each user
   */
  private async collectUniqueSymbols(): Promise<string[]> {
    try {
      const collection = getPortfolioSnapshotCollection();

      // Get all snapshots (we'll optimize this with aggregation)
      // For now, we'll get the most recent snapshot per user
      const pipeline = [
        // Sort by date descending
        { $sort: { userId: 1, snapshotDate: -1 } },
        // Group by userId and take the first (most recent) snapshot
        {
          $group: {
            _id: '$userId',
            latestSnapshot: { $first: '$$ROOT' },
          },
        },
        // Unwind positions array
        { $unwind: '$latestSnapshot.positions' },
        // Get unique ISINs (we'll need to convert these to symbols)
        {
          $group: {
            _id: '$latestSnapshot.positions.isin',
            assetName: { $first: '$latestSnapshot.positions.assetName' },
            symbol: { $first: '$latestSnapshot.positions.symbol' },
          },
        },
      ];

      const results = await collection.aggregate(pipeline).toArray();

      logger.info(`Found ${results.length} unique assets across all portfolios`);

      // For now, we'll assume the ISIN can be used as a symbol or needs mapping
      // In a real implementation, you'd want to:
      // 1. Store the symbol mapping in the database
      // 2. Use a separate API to resolve ISINs to symbols
      // 3. Cache the mappings

      const symbols: string[] = [];
      for (const result of results) {
        const isin = result._id;
        const assetName = result.assetName;
        const storedSymbol = result.symbol;

        // Extract or resolve symbol
        let symbol = await this.extractSymbolFromISIN(isin, assetName, storedSymbol);

        if (symbol) {
          symbols.push(symbol);
        } else {
          logger.warn(`Could not resolve symbol for ${assetName} (${isin})`);
        }
      }

      return [...new Set(symbols)]; // Remove duplicates
    } catch (error) {
      logger.error('Failed to collect unique symbols', { error });
      return [];
    }
  }

  /**
   * Extract or resolve symbol from ISIN and asset name
   * Uses database mappings, stored symbol data, extraction from name, or API resolution
   */
  private async extractSymbolFromISIN(
    isin: string,
    assetName: string,
    storedSymbol?: string
  ): Promise<string | null> {
    // Import dependencies dynamically to avoid circular dependency
    const { default: symbolExtractor } = await import('../utils/symbolExtractor.js');
    const { getTickerByISIN } = await import('../models/SymbolMapping.js');

    // Priority 1: Check database mapping (most reliable)
    try {
      const dbTicker = await getTickerByISIN(isin);
      if (dbTicker) {
        logger.debug(`Found ticker ${dbTicker} for ISIN ${isin} in database`);
        return dbTicker;
      }
    } catch (error) {
      logger.debug(`Error checking database mapping for ${isin}:`, error);
    }

    // Priority 2: Use stored symbol if available
    if (storedSymbol && symbolExtractor.isValidSymbol(storedSymbol)) {
      const suffix = symbolExtractor.getMarketSuffixFromISIN(isin);
      return symbolExtractor.normalizeSymbol(storedSymbol) + suffix;
    }

    // Priority 3: Extract from asset name
    const extractedSymbol = symbolExtractor.extractSymbolFromName(assetName);
    if (extractedSymbol) {
      const suffix = symbolExtractor.getMarketSuffixFromISIN(isin);
      return symbolExtractor.normalizeSymbol(extractedSymbol) + suffix;
    }

    // Priority 4: Try to resolve using the Twelve Data API (cached)
    try {
      const symbol = await priceCache.resolveISIN(isin);
      if (symbol) {
        return symbol;
      }
    } catch (error) {
      logger.debug(`Could not resolve ISIN ${isin} via API`);
    }

    // Priority 5: Try ISIN directly (Twelve Data supports some ISINs)
    logger.debug(`Using ISIN ${isin} directly for ${assetName}`);
    return isin;
  }
}

// Export singleton instance - starts automatically when imported
// 5 minutes interval to optimize API quota usage (800 calls/day)
// With market hours only (9h-18h, Mon-Fri), this uses ~540 calls/week (~77/day average)
const worker = new PriceUpdateWorker(5);

export default worker;
