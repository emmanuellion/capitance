import logger from '../utils/logger.js';

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percent_change: number;
  timestamp: number;
  currency?: string;
}

export interface TwelveDataBatchQuote {
  symbol: string;
  price?: number;
  name?: string;
  exchange?: string;
  currency?: string;
  timestamp?: number;
}

export interface TwelveDataError {
  code: number;
  message: string;
  status: string;
}

class TwelveDataService {
  private apiKey: string;
  private baseUrl: string = 'https://api.twelvedata.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    logger.info('TwelveDataService initialized');
  }

  /**
   * Get real-time quote for a single symbol
   */
  async getQuote(symbol: string): Promise<TwelveDataQuote | null> {
    try {
      const url = `${this.baseUrl}/quote?symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        logger.error(`TwelveData API error for ${symbol}`, { status: response.status });
        return null;
      }

      const data = await response.json();

      // Check for API errors
      if (data.status === 'error' || data.code) {
        logger.warn(`TwelveData returned error for ${symbol}`, { error: data });
        return null;
      }

      return {
        symbol: data.symbol,
        name: data.name,
        price: parseFloat(data.close || data.price || '0'),
        change: parseFloat(data.change || '0'),
        percent_change: parseFloat(data.percent_change || '0'),
        timestamp: data.timestamp || Date.now() / 1000,
        currency: data.currency,
      };
    } catch (error) {
      logger.error(`Failed to fetch quote for ${symbol}`, { error });
      return null;
    }
  }

  /**
   * Get real-time quotes for multiple symbols (batch request)
   * Twelve Data allows up to 120 symbols per request
   */
  async getBatchQuotes(symbols: string[]): Promise<Map<string, TwelveDataBatchQuote>> {
    const results = new Map<string, TwelveDataBatchQuote>();

    if (symbols.length === 0) {
      return results;
    }

    // Twelve Data limit: 120 symbols per batch
    const batchSize = 120;
    const batches: string[][] = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }

    logger.info(`Fetching quotes for ${symbols.length} symbols in ${batches.length} batches`);

    for (const batch of batches) {
      try {
        const symbolsList = batch.join(',');
        const url = `${this.baseUrl}/price?symbol=${symbolsList}&apikey=${this.apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
          logger.error('TwelveData batch API error', { status: response.status });
          continue;
        }

        const data = await response.json();

        // Handle single symbol response (object) vs multi-symbol (nested object)
        if (batch.length === 1) {
          const symbol = batch[0];
          if (data.price) {
            results.set(symbol, {
              symbol,
              price: parseFloat(data.price),
              timestamp: Date.now() / 1000,
            });
          }
        } else {
          // Multi-symbol response
          for (const symbol of batch) {
            const quote = data[symbol];
            if (quote && quote.price) {
              results.set(symbol, {
                symbol,
                price: parseFloat(quote.price),
                timestamp: Date.now() / 1000,
              });
            }
          }
        }
      } catch (error) {
        logger.error('Failed to fetch batch quotes', { error, batch });
      }

      // Rate limiting: wait a bit between batches (800 calls/day = ~33 calls/hour = ~0.5 calls/min)
      if (batches.length > 1) {
        await this.delay(2000); // 2 seconds between batches
      }
    }

    logger.info(`Successfully fetched ${results.size}/${symbols.length} quotes`);
    return results;
  }

  /**
   * Convert ISIN to symbol (simplified - may need enhancement)
   * This is a basic implementation. For production, you might want to:
   * 1. Maintain a mapping database of ISIN -> Symbol
   * 2. Use a separate API to resolve ISINs
   * 3. Cache the mappings
   */
  async resolveISINToSymbol(isin: string): Promise<string | null> {
    try {
      // Try to search for the ISIN
      const url = `${this.baseUrl}/symbol_search?symbol=${isin}&apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        return data.data[0].symbol;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to resolve ISIN ${isin}`, { error });
      return null;
    }
  }

  /**
   * Get time series data for historical prices
   */
  async getTimeSeries(
    symbol: string,
    interval: string = '1day',
    outputsize: number = 30
  ): Promise<any[] | null> {
    try {
      const url = `${this.baseUrl}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        logger.error(`TwelveData time series error for ${symbol}`, { status: response.status });
        return null;
      }

      const data = await response.json();

      if (data.status === 'error' || !data.values) {
        logger.warn(`TwelveData returned no time series for ${symbol}`);
        return null;
      }

      return data.values;
    } catch (error) {
      logger.error(`Failed to fetch time series for ${symbol}`, { error });
      return null;
    }
  }

  /**
   * Utility: delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get API usage/credits information
   */
  async getApiUsage(): Promise<any> {
    try {
      const url = `${this.baseUrl}/api_usage?apikey=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch API usage', { error });
      return null;
    }
  }
}

export default TwelveDataService;
