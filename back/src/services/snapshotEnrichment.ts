import logger from '../utils/logger.js';
import priceCache from './priceCache.js';
import type { PortfolioSnapshot, NormalizedPosition } from '../types/snapshot.types.js';

export interface EnrichedPosition extends NormalizedPosition {
  // Real-time data
  realtimePrice?: number;
  realtimeValue?: number;
  realtimeGainLoss?: number;
  realtimeGainLossPercentage?: number;
  priceLastUpdated?: Date;

  // Comparison with snapshot data
  priceDifference?: number; // Difference between snapshot price and real-time price
  priceDifferencePercentage?: number;
}

export interface EnrichedSnapshot extends Omit<PortfolioSnapshot, 'positions'> {
  positions: EnrichedPosition[];

  // Real-time aggregated totals
  realtimeTotalValue?: number;
  realtimeTotalGainLoss?: number;
  realtimeTotalGainLossPercentage?: number;

  // Comparison with snapshot totals
  totalValueDifference?: number;
  totalValueDifferencePercentage?: number;

  // Metadata
  enrichedAt: Date;
  pricesAvailable: number; // How many positions have real-time prices
}

class SnapshotEnrichmentService {
  /**
   * Enrich a single snapshot with real-time prices
   */
  async enrichSnapshot(snapshot: PortfolioSnapshot): Promise<EnrichedSnapshot> {
    logger.info(`Enriching snapshot ${snapshot._id} with real-time prices`);

    // Import symbolExtractor
    const { default: symbolExtractor } = await import('../utils/symbolExtractor.js');

    // Build symbol list from positions
    const symbolsToFetch: string[] = [];
    const positionSymbolMap = new Map<string, string>(); // ISIN -> Symbol

    for (const position of snapshot.positions) {
      // Use stored symbol, extracted symbol, or ISIN
      const symbol = symbolExtractor.buildSymbolForLookup({
        symbol: position.symbol,
        assetName: position.assetName,
        isin: position.isin,
      });

      if (symbol) {
        symbolsToFetch.push(symbol);
        positionSymbolMap.set(position.isin, symbol);
      } else {
        // Last resort: try to resolve via API
        const resolvedSymbol = await priceCache.resolveISIN(position.isin);
        if (resolvedSymbol) {
          symbolsToFetch.push(resolvedSymbol);
          positionSymbolMap.set(position.isin, resolvedSymbol);
        }
      }
    }

    // Fetch prices for all symbols
    const prices = await priceCache.getPrices(symbolsToFetch);

    // Create reverse mapping: ISIN -> Price
    const isinToPrice = new Map<string, number>();
    for (const [isin, symbol] of positionSymbolMap.entries()) {
      const priceData = prices.get(symbol);
      if (priceData) {
        isinToPrice.set(isin, priceData.price);
      }
    }

    // Enrich each position
    const enrichedPositions: EnrichedPosition[] = [];
    let pricesAvailable = 0;

    for (const position of snapshot.positions) {
      const realtimePrice = isinToPrice.get(position.isin);

      if (realtimePrice && realtimePrice > 0) {
        pricesAvailable++;

        // Calculate real-time values
        const realtimeValue = position.quantity * realtimePrice;
        const realtimeGainLoss = realtimeValue - position.totalInvested;
        const realtimeGainLossPercentage =
          position.totalInvested > 0 ? (realtimeGainLoss / position.totalInvested) * 100 : 0;

        // Calculate difference from snapshot
        const priceDifference = realtimePrice - position.currentPrice;
        const priceDifferencePercentage =
          position.currentPrice > 0 ? (priceDifference / position.currentPrice) * 100 : 0;

        enrichedPositions.push({
          ...position,
          realtimePrice,
          realtimeValue,
          realtimeGainLoss,
          realtimeGainLossPercentage,
          priceLastUpdated: new Date(),
          priceDifference,
          priceDifferencePercentage,
        });
      } else {
        // No real-time price available - keep original data
        enrichedPositions.push({
          ...position,
        });
        logger.debug(`No real-time price for ${position.assetName} (${position.isin})`);
      }
    }

    // Calculate real-time aggregated totals
    let realtimeTotalValue = 0;
    let realtimeTotalGainLoss = 0;

    for (const position of enrichedPositions) {
      if (position.realtimeValue !== undefined) {
        realtimeTotalValue += position.realtimeValue;
        realtimeTotalGainLoss += position.realtimeGainLoss!;
      } else {
        // Fallback to snapshot value
        realtimeTotalValue += position.currentValue;
        realtimeTotalGainLoss += position.gainLoss;
      }
    }

    const realtimeTotalGainLossPercentage =
      snapshot.totalInvested > 0 ? (realtimeTotalGainLoss / snapshot.totalInvested) * 100 : 0;

    // Calculate difference from snapshot totals
    const totalValueDifference = realtimeTotalValue - snapshot.totalValue;
    const totalValueDifferencePercentage =
      snapshot.totalValue > 0 ? (totalValueDifference / snapshot.totalValue) * 100 : 0;

    logger.info(`Enrichment complete: ${pricesAvailable}/${snapshot.positions.length} prices updated`);

    return {
      ...snapshot,
      positions: enrichedPositions,
      realtimeTotalValue,
      realtimeTotalGainLoss,
      realtimeTotalGainLossPercentage,
      totalValueDifference,
      totalValueDifferencePercentage,
      enrichedAt: new Date(),
      pricesAvailable,
    };
  }

  /**
   * Enrich multiple snapshots
   */
  async enrichSnapshots(snapshots: PortfolioSnapshot[]): Promise<EnrichedSnapshot[]> {
    const enriched: EnrichedSnapshot[] = [];

    for (const snapshot of snapshots) {
      const enrichedSnapshot = await this.enrichSnapshot(snapshot);
      enriched.push(enrichedSnapshot);
    }

    return enriched;
  }

  /**
   * Get only the positions that have significant price changes (> threshold %)
   */
  async getSignificantChanges(
    snapshot: PortfolioSnapshot,
    threshold: number = 2.0
  ): Promise<EnrichedPosition[]> {
    const enriched = await this.enrichSnapshot(snapshot);

    return enriched.positions.filter((position) => {
      if (position.priceDifferencePercentage === undefined) {
        return false;
      }
      return Math.abs(position.priceDifferencePercentage) >= threshold;
    });
  }

  /**
   * Get portfolio performance summary with real-time data
   */
  async getPortfolioPerformanceSummary(snapshot: PortfolioSnapshot): Promise<{
    snapshot: {
      totalValue: number;
      totalGainLoss: number;
      totalGainLossPercentage: number;
    };
    realtime: {
      totalValue: number;
      totalGainLoss: number;
      totalGainLossPercentage: number;
    };
    change: {
      valueChange: number;
      valueChangePercentage: number;
    };
    metadata: {
      snapshotDate: Date;
      enrichedAt: Date;
      pricesAvailable: number;
      totalPositions: number;
    };
  }> {
    const enriched = await this.enrichSnapshot(snapshot);

    return {
      snapshot: {
        totalValue: snapshot.totalValue,
        totalGainLoss: snapshot.totalGainLoss,
        totalGainLossPercentage: snapshot.totalGainLossPercentage,
      },
      realtime: {
        totalValue: enriched.realtimeTotalValue!,
        totalGainLoss: enriched.realtimeTotalGainLoss!,
        totalGainLossPercentage: enriched.realtimeTotalGainLossPercentage!,
      },
      change: {
        valueChange: enriched.totalValueDifference!,
        valueChangePercentage: enriched.totalValueDifferencePercentage!,
      },
      metadata: {
        snapshotDate: snapshot.snapshotDate,
        enrichedAt: enriched.enrichedAt,
        pricesAvailable: enriched.pricesAvailable,
        totalPositions: snapshot.positions.length,
      },
    };
  }
}

export default new SnapshotEnrichmentService();
