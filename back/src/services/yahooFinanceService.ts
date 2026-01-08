import logger from '../utils/logger.js';

export interface YahooFinanceQuote {
  symbol: string;
  price: number;
  currency?: string;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  marketState?: string;
}

interface YahooFinanceResponse {
  quoteResponse: {
    result?: Array<{
      symbol: string;
      regularMarketPrice?: number;
      regularMarketPreviousClose?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      currency?: string;
      marketState?: string;
    }>;
    error?: any;
  };
}

class YahooFinanceService {
  private baseUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';
  private requestCount = 0;
  private lastResetTime = Date.now();

  constructor() {
    logger.info('YahooFinanceService initialized (free, unlimited)');
  }

  /**
   * Track API usage for monitoring (Yahoo Finance is free but we track for stats)
   */
  private trackRequest(): void {
    const now = Date.now();
    const hoursSinceReset = (now - this.lastResetTime) / (1000 * 60 * 60);

    // Reset counter every 24 hours
    if (hoursSinceReset >= 24) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    this.requestCount++;
  }

  /**
   * Get current API usage stats
   */
  getUsageStats(): { current_usage: number; plan_limit: number; period: string } {
    return {
      current_usage: this.requestCount,
      plan_limit: 999999, // Unlimited (but we track)
      period: '24h',
    };
  }

  /**
   * Get real-time quote for a symbol using chart endpoint (more reliable)
   */
  async getQuote(symbol: string): Promise<YahooFinanceQuote | null> {
    try {
      this.trackRequest();

      // Use chart endpoint which is more stable
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        logger.warn(`Yahoo Finance API error: ${response.statusText}`, { symbol });
        return null;
      }

      const data = await response.json();

      // Check for errors
      if (data.chart?.error) {
        logger.warn('Yahoo Finance API error:', {
          symbol,
          error: data.chart.error,
        });
        return null;
      }

      // Get result
      const result = data.chart?.result?.[0];
      if (!result) {
        logger.debug(`No chart data available for ${symbol} from Yahoo Finance`);
        return null;
      }

      const meta = result.meta;
      const price = meta?.regularMarketPrice;

      if (!price || price <= 0) {
        logger.debug(`No valid price for ${symbol} from Yahoo Finance`);
        return null;
      }

      const quote: YahooFinanceQuote = {
        symbol: meta.symbol || symbol,
        price: price,
        currency: meta.currency,
        previousClose: meta.previousClose,
        change: meta.regularMarketPrice - (meta.previousClose || 0),
        changePercent: meta.previousClose
          ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
          : undefined,
        marketState: meta.marketState,
      };

      logger.debug(`Retrieved quote from Yahoo Finance for ${symbol}: ${quote.price}`);
      return quote;
    } catch (error) {
      logger.error(`Error fetching quote from Yahoo Finance for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get batch quotes for multiple symbols
   * Makes individual requests to avoid rate limiting issues
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, YahooFinanceQuote>> {
    const quotes = new Map<string, YahooFinanceQuote>();

    if (symbols.length === 0) {
      return quotes;
    }

    logger.info(`Fetching quotes for ${symbols.length} symbols from Yahoo Finance`);

    // Fetch each symbol individually to avoid rate limits
    // Yahoo Finance is fast enough that this is acceptable
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        if (quote) {
          quotes.set(symbol, quote);
        }
      } catch (error) {
        logger.error(`Failed to fetch quote for ${symbol} from Yahoo Finance:`, error);
      }
    }

    logger.info(`Successfully fetched ${quotes.size}/${symbols.length} quotes from Yahoo Finance`);

    return quotes;
  }
}

// Export class for testing
export { YahooFinanceService };

// Export singleton instance
const yahooFinanceService = new YahooFinanceService();
export default yahooFinanceService;
