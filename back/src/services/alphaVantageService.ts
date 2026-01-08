import config from '../config/config.js';
import logger from '../utils/logger.js';

export interface AlphaVantageQuote {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  latestTradingDay: string;
  previousClose: number;
  change: number;
  changePercent: string;
}

export interface AlphaVantageError {
  'Error Message'?: string;
  'Note'?: string;
  'Information'?: string;
}

class AlphaVantageService {
  private baseUrl = 'https://www.alphavantage.co/query';
  private apiKey: string;
  private requestCount = 0;
  private lastResetTime = Date.now();

  constructor() {
    this.apiKey = config.alphaVantage?.apiKey || '';
    if (!this.apiKey) {
      logger.warn('Alpha Vantage API key not configured');
    } else {
      logger.info('AlphaVantageService initialized');
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Track API usage for monitoring
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
      plan_limit: 500, // Alpha Vantage free tier limit
      period: '24h',
    };
  }

  /**
   * Convert ticker format from Euronext (.PA) to Alpha Vantage (.PAR)
   * Alpha Vantage uses different exchange suffixes
   */
  private convertTickerFormat(ticker: string): string {
    // Map of common exchange suffixes
    const exchangeMap: Record<string, string> = {
      '.PA': '.PAR',   // Euronext Paris
      '.AS': '.AMS',   // Euronext Amsterdam
      '.BR': '.BRU',   // Euronext Brussels
      '.LS': '.LIS',   // Euronext Lisbon
      '.MC': '.MAD',   // Madrid
      '.MI': '.MIL',   // Milan
      '.L': '.LON',    // London
      '.DE': '.FRK',   // Frankfurt (Xetra)
      '.SW': '.SWX',   // Swiss Exchange
    };

    for (const [from, to] of Object.entries(exchangeMap)) {
      if (ticker.endsWith(from)) {
        return ticker.replace(from, to);
      }
    }

    return ticker;
  }

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<AlphaVantageQuote | null> {
    if (!this.isConfigured()) {
      throw new Error('Alpha Vantage API key not configured');
    }

    try {
      this.trackRequest();

      // Convert ticker format for Alpha Vantage
      const avSymbol = this.convertTickerFormat(symbol);

      const url = new URL(this.baseUrl);
      url.searchParams.append('function', 'GLOBAL_QUOTE');
      url.searchParams.append('symbol', avSymbol);
      url.searchParams.append('apikey', this.apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API errors or rate limit
      if (data['Error Message'] || data['Note'] || data['Information']) {
        const errorData = data as AlphaVantageError;
        logger.warn('Alpha Vantage API response:', {
          symbol: avSymbol,
          error: errorData['Error Message'],
          note: errorData['Note'],
          info: errorData['Information'],
        });
        return null;
      }

      // Parse Global Quote response
      const globalQuote = data['Global Quote'];
      if (!globalQuote || Object.keys(globalQuote).length === 0) {
        logger.debug(`No quote data available for ${symbol} (${avSymbol})`);
        return null;
      }

      // Alpha Vantage returns data with numeric keys like "01. symbol", "05. price"
      const quote: AlphaVantageQuote = {
        symbol: symbol, // Use original symbol format
        open: parseFloat(globalQuote['02. open'] || '0'),
        high: parseFloat(globalQuote['03. high'] || '0'),
        low: parseFloat(globalQuote['04. low'] || '0'),
        price: parseFloat(globalQuote['05. price'] || '0'),
        volume: parseInt(globalQuote['06. volume'] || '0'),
        latestTradingDay: globalQuote['07. latest trading day'] || '',
        previousClose: parseFloat(globalQuote['08. previous close'] || '0'),
        change: parseFloat(globalQuote['09. change'] || '0'),
        changePercent: globalQuote['10. change percent'] || '0%',
      };

      if (quote.price > 0) {
        logger.debug(`Retrieved quote for ${symbol}: ${quote.price}`);
        return quote;
      }

      return null;
    } catch (error) {
      logger.error(`Error fetching quote from Alpha Vantage for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get batch quotes for multiple symbols
   * Note: Alpha Vantage doesn't support batch requests, so we make individual requests
   * with rate limiting
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, AlphaVantageQuote>> {
    const quotes = new Map<string, AlphaVantageQuote>();

    logger.info(`Fetching quotes for ${symbols.length} symbols from Alpha Vantage (sequential)`);

    // Alpha Vantage free tier: max 5 requests per minute
    const delayBetweenRequests = 12000; // 12 seconds between requests to stay under limit

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];

      try {
        const quote = await this.getQuote(symbol);
        if (quote) {
          quotes.set(symbol, quote);
        }

        // Add delay between requests (except for last one)
        if (i < symbols.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests));
        }
      } catch (error) {
        logger.error(`Failed to fetch quote for ${symbol}:`, error);
      }
    }

    logger.info(`Successfully fetched ${quotes.size}/${symbols.length} quotes from Alpha Vantage`);

    return quotes;
  }
}

// Export class for testing
export { AlphaVantageService };

// Export singleton instance
const alphaVantageService = new AlphaVantageService();
export default alphaVantageService;
