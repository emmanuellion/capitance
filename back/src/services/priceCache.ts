import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';
import TwelveDataService, { type TwelveDataBatchQuote } from './twelveDataService.js';
import AlphaVantageService, { type AlphaVantageQuote } from './alphaVantageService.js';
import YahooFinanceService, { type YahooFinanceQuote } from './yahooFinanceService.js';

export interface CachedPrice {
  symbol: string;
  price: number;
  timestamp: number;
  currency?: string;
  source?: 'twelve_data' | 'alpha_vantage' | 'yahoo_finance';
}

export interface PriceUpdate {
  symbol: string;
  isin?: string;
  oldPrice?: number;
  newPrice: number;
  change?: number;
  percentChange?: number;
  timestamp: number;
}

class PriceCacheService {
  private twelveDataService: TwelveDataService;
  private alphaVantageService: typeof AlphaVantageService;
  private yahooFinanceService: typeof YahooFinanceService;
  private cacheTTL: number;
  private readonly PRICE_KEY_PREFIX = 'price:';
  private readonly SYMBOL_MAP_KEY_PREFIX = 'symbol_map:'; // ISIN -> Symbol mapping

  constructor() {
    this.twelveDataService = new TwelveDataService(config.twelveData.apiKey);
    this.alphaVantageService = AlphaVantageService;
    this.yahooFinanceService = YahooFinanceService;
    this.cacheTTL = config.twelveData.cacheTTL; // 2 minutes by default
    logger.info('PriceCacheService initialized', { cacheTTL: this.cacheTTL });
  }

  /**
   * Determine which API to use based on the ticker
   * European tickers (.PA, .AS, .DE, etc.) use Alpha Vantage
   * US and other tickers use Twelve Data
   */
  private shouldUseAlphaVantage(symbol: string): boolean {
    const europeanExchanges = ['.PA', '.AS', '.BR', '.LS', '.MC', '.MI', '.L', '.DE', '.SW'];
    return europeanExchanges.some((exchange) => symbol.toUpperCase().endsWith(exchange));
  }

  /**
   * Get price from cache, or fetch from API if not cached
   */
  async getPrice(symbol: string): Promise<CachedPrice | null> {
    if (!redisClient) {
      // If Redis is disabled, fetch directly from API
      return this.fetchPriceFromAPI(symbol);
    }

    try {
      // Try to get from cache first
      const cacheKey = this.getPriceKey(symbol);
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug(`Cache hit for ${symbol}`);
        return JSON.parse(cached) as CachedPrice;
      }

      // Cache miss - fetch from API
      logger.debug(`Cache miss for ${symbol}`);
      const price = await this.fetchPriceFromAPI(symbol);

      if (price) {
        await this.setCachedPrice(symbol, price);
      }

      return price;
    } catch (error) {
      logger.error(`Error getting price for ${symbol}`, { error });
      return null;
    }
  }

  /**
   * Get multiple prices from cache or API
   */
  async getPrices(symbols: string[]): Promise<Map<string, CachedPrice>> {
    const results = new Map<string, CachedPrice>();

    if (symbols.length === 0) {
      return results;
    }

    // Try to get from cache first
    const uncachedSymbols: string[] = [];

    if (redisClient) {
      try {
        const keys = symbols.map((s) => this.getPriceKey(s));
        const cachedValues = await redisClient.mget(...keys);

        symbols.forEach((symbol, index) => {
          const cached = cachedValues[index];
          if (cached) {
            const price = JSON.parse(cached) as CachedPrice;
            results.set(symbol, price);
          } else {
            uncachedSymbols.push(symbol);
          }
        });

        logger.info(`Cache: ${results.size} hits, ${uncachedSymbols.length} misses`);
      } catch (error) {
        logger.error('Error reading from cache', { error });
        uncachedSymbols.push(...symbols);
      }
    } else {
      uncachedSymbols.push(...symbols);
    }

    // Fetch uncached prices from API
    if (uncachedSymbols.length > 0) {
      const apiPrices = await this.fetchPricesFromAPI(uncachedSymbols);

      // Cache the newly fetched prices
      for (const [symbol, quote] of apiPrices.entries()) {
        const price: CachedPrice = {
          symbol,
          price: quote.price || 0,
          timestamp: quote.timestamp || Date.now() / 1000,
          currency: quote.currency,
        };
        results.set(symbol, price);
        await this.setCachedPrice(symbol, price);
      }
    }

    return results;
  }

  /**
   * Force refresh prices for given symbols (bypass cache)
   */
  async refreshPrices(symbols: string[]): Promise<Map<string, PriceUpdate>> {
    const updates = new Map<string, PriceUpdate>();

    if (symbols.length === 0) {
      return updates;
    }

    logger.info(`Force refreshing prices for ${symbols.length} symbols`);

    // Get old prices from cache
    const oldPrices = new Map<string, number>();
    if (redisClient) {
      try {
        const keys = symbols.map((s) => this.getPriceKey(s));
        const cachedValues = await redisClient.mget(...keys);

        symbols.forEach((symbol, index) => {
          const cached = cachedValues[index];
          if (cached) {
            const price = JSON.parse(cached) as CachedPrice;
            oldPrices.set(symbol, price.price);
          }
        });
      } catch (error) {
        logger.error('Error reading old prices from cache', { error });
      }
    }

    // Fetch new prices from API
    const apiPrices = await this.fetchPricesFromAPI(symbols);

    // Calculate updates and cache
    for (const [symbol, quote] of apiPrices.entries()) {
      const newPrice = quote.price || 0;
      const oldPrice = oldPrices.get(symbol);
      const change = oldPrice ? newPrice - oldPrice : undefined;
      const percentChange = oldPrice && oldPrice > 0 ? (change! / oldPrice) * 100 : undefined;

      const update: PriceUpdate = {
        symbol,
        oldPrice,
        newPrice,
        change,
        percentChange,
        timestamp: quote.timestamp || Date.now() / 1000,
      };

      updates.set(symbol, update);

      // Cache the new price
      const cachedPrice: CachedPrice = {
        symbol,
        price: newPrice,
        timestamp: update.timestamp,
        currency: quote.currency,
      };
      await this.setCachedPrice(symbol, cachedPrice);
    }

    logger.info(`Refreshed ${updates.size} prices`);
    return updates;
  }

  /**
   * Map ISIN to symbol and cache the mapping
   */
  async resolveISIN(isin: string): Promise<string | null> {
    if (!redisClient) {
      return this.twelveDataService.resolveISINToSymbol(isin);
    }

    try {
      // Check cache first
      const cacheKey = this.getSymbolMapKey(isin);
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug(`Symbol mapping cache hit for ISIN ${isin} -> ${cached}`);
        return cached;
      }

      // Cache miss - resolve via API
      const symbol = await this.twelveDataService.resolveISINToSymbol(isin);

      if (symbol) {
        // Cache the mapping (long TTL - ISINs don't change)
        await redisClient.setex(cacheKey, 86400 * 30, symbol); // 30 days
        logger.info(`Cached ISIN mapping: ${isin} -> ${symbol}`);
      }

      return symbol;
    } catch (error) {
      logger.error(`Error resolving ISIN ${isin}`, { error });
      return null;
    }
  }

  /**
   * Resolve multiple ISINs to symbols
   */
  async resolveISINs(isins: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const isin of isins) {
      const symbol = await this.resolveISIN(isin);
      if (symbol) {
        results.set(isin, symbol);
      }
    }

    return results;
  }

  /**
   * Clear cache for specific symbols
   */
  async clearCache(symbols?: string[]): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      if (symbols && symbols.length > 0) {
        const keys = symbols.map((s) => this.getPriceKey(s));
        await redisClient.del(...keys);
        logger.info(`Cleared cache for ${symbols.length} symbols`);
      } else {
        // Clear all price cache
        const pattern = this.getPriceKey('*');
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
          logger.info(`Cleared all price cache (${keys.length} keys)`);
        }
      }
    } catch (error) {
      logger.error('Error clearing cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalPrices: number;
    totalMappings: number;
    apiUsage?: any;
  }> {
    let totalPrices = 0;
    let totalMappings = 0;

    if (redisClient) {
      try {
        const priceKeys = await redisClient.keys(this.getPriceKey('*'));
        const mappingKeys = await redisClient.keys(this.getSymbolMapKey('*'));
        totalPrices = priceKeys.length;
        totalMappings = mappingKeys.length;
      } catch (error) {
        logger.error('Error getting cache stats', { error });
      }
    }

    // Get API usage from Twelve Data
    const apiUsage = await this.twelveDataService.getApiUsage();

    return {
      totalPrices,
      totalMappings,
      apiUsage,
    };
  }

  /**
   * Private helper: Fetch price from API (Alpha Vantage or Twelve Data)
   */
  private async fetchPriceFromAPI(symbol: string): Promise<CachedPrice | null> {
    try {
      if (this.shouldUseAlphaVantage(symbol)) {
        // Use Alpha Vantage for European tickers
        const quote = await this.alphaVantageService.getQuote(symbol);
        if (!quote) {
          return null;
        }

        return {
          symbol: quote.symbol,
          price: quote.price,
          timestamp: Date.now() / 1000,
          source: 'alpha_vantage',
        };
      } else {
        // Use Twelve Data for US and other tickers
        const quote = await this.twelveDataService.getQuote(symbol);
        if (!quote) {
          return null;
        }

        return {
          symbol: quote.symbol,
          price: quote.price,
          timestamp: quote.timestamp,
          currency: quote.currency,
          source: 'twelve_data',
        };
      }
    } catch (error) {
      logger.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Private helper: Fetch multiple prices from API (smart routing with fallback)
   */
  private async fetchPricesFromAPI(symbols: string[]): Promise<Map<string, TwelveDataBatchQuote>> {
    const results = new Map<string, TwelveDataBatchQuote>();

    // Separate symbols by API
    const europeanSymbols = symbols.filter((s) => this.shouldUseAlphaVantage(s));
    const usSymbols = symbols.filter((s) => !this.shouldUseAlphaVantage(s));

    logger.info(`Routing: ${europeanSymbols.length} European, ${usSymbols.length} US symbols`);

    // Fetch European symbols from Alpha Vantage first
    const failedSymbols: string[] = [];

    if (europeanSymbols.length > 0 && this.alphaVantageService.isConfigured()) {
      logger.info(`Trying Alpha Vantage for ${europeanSymbols.length} symbols`);
      const avQuotes = await this.alphaVantageService.getBatchQuotes(europeanSymbols);

      for (const [symbol, quote] of avQuotes.entries()) {
        // Convert Alpha Vantage quote to TwelveDataBatchQuote format
        results.set(symbol, {
          symbol: quote.symbol,
          price: quote.price,
          timestamp: Date.now() / 1000,
          currency: 'EUR',
        });
      }

      // Track symbols that failed from Alpha Vantage
      for (const symbol of europeanSymbols) {
        if (!results.has(symbol)) {
          failedSymbols.push(symbol);
        }
      }

      logger.info(`Alpha Vantage: ${avQuotes.size} succeeded, ${failedSymbols.length} failed`);
    } else {
      failedSymbols.push(...europeanSymbols);
    }

    // Fallback to Yahoo Finance for failed European symbols
    if (failedSymbols.length > 0) {
      logger.info(`Trying Yahoo Finance fallback for ${failedSymbols.length} symbols`);
      const yahooQuotes = await this.yahooFinanceService.getBatchQuotes(failedSymbols);

      for (const [symbol, quote] of yahooQuotes.entries()) {
        results.set(symbol, {
          symbol: quote.symbol,
          price: quote.price,
          timestamp: Date.now() / 1000,
          currency: quote.currency || 'EUR',
        });
      }

      logger.info(`Yahoo Finance: ${yahooQuotes.size}/${failedSymbols.length} succeeded`);
    }

    // Fetch from Twelve Data for US symbols
    if (usSymbols.length > 0) {
      const tdQuotes = await this.twelveDataService.getBatchQuotes(usSymbols);
      for (const [symbol, quote] of tdQuotes.entries()) {
        results.set(symbol, quote);
      }
    }

    return results;
  }

  /**
   * Private helper: Set price in cache
   */
  private async setCachedPrice(symbol: string, price: CachedPrice): Promise<void> {
    if (!redisClient) {
      return;
    }

    try {
      const cacheKey = this.getPriceKey(symbol);
      await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(price));
      logger.debug(`Cached price for ${symbol}`);
    } catch (error) {
      logger.error(`Error caching price for ${symbol}`, { error });
    }
  }

  /**
   * Private helper: Get Redis key for price
   */
  private getPriceKey(symbol: string): string {
    return `${this.PRICE_KEY_PREFIX}${symbol}`;
  }

  /**
   * Private helper: Get Redis key for ISIN mapping
   */
  private getSymbolMapKey(isin: string): string {
    return `${this.SYMBOL_MAP_KEY_PREFIX}${isin}`;
  }
}

// Export singleton instance
export default new PriceCacheService();
