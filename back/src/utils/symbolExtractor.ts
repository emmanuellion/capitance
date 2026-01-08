import logger from './logger.js';

/**
 * Utility class to extract ticker symbols from asset names
 */
class SymbolExtractor {
  /**
   * Extract symbol from asset name
   * Handles common formats:
   * - "Apple Inc. (AAPL)"
   * - "Microsoft Corporation [MSFT]"
   * - "Tesla Inc - TSLA"
   * - "AMAZON.COM INC. - AMZN"
   */
  extractSymbolFromName(assetName: string): string | null {
    if (!assetName) {
      return null;
    }

    // Pattern 1: Symbol in parentheses (most common)
    // e.g., "Apple Inc. (AAPL)" -> "AAPL"
    const parenthesesMatch = assetName.match(/\(([A-Z]{1,5})\)/);
    if (parenthesesMatch) {
      return parenthesesMatch[1];
    }

    // Pattern 2: Symbol in square brackets
    // e.g., "Microsoft Corporation [MSFT]" -> "MSFT"
    const bracketsMatch = assetName.match(/\[([A-Z]{1,5})\]/);
    if (bracketsMatch) {
      return bracketsMatch[1];
    }

    // Pattern 3: Symbol after dash or hyphen
    // e.g., "Tesla Inc - TSLA" -> "TSLA"
    const dashMatch = assetName.match(/[-–]\s*([A-Z]{1,5})$/);
    if (dashMatch) {
      return dashMatch[1];
    }

    // Pattern 4: Symbol at the end after whitespace
    // e.g., "AMAZON.COM INC. AMZN" -> "AMZN"
    const endMatch = assetName.match(/\s([A-Z]{1,5})$/);
    if (endMatch) {
      return endMatch[1];
    }

    // Pattern 5: If the whole name is just a symbol
    // e.g., "AAPL" -> "AAPL"
    if (/^[A-Z]{1,5}$/.test(assetName.trim())) {
      return assetName.trim();
    }

    logger.debug(`Could not extract symbol from asset name: ${assetName}`);
    return null;
  }

  /**
   * Extract symbol from ISIN for US stocks
   * US ISINs start with "US" followed by a 9-digit CUSIP
   * This is a simple heuristic - not always accurate
   */
  extractSymbolFromISIN(isin: string): string | null {
    if (!isin || isin.length !== 12) {
      return null;
    }

    // For US stocks (US prefix), we can't reliably extract the symbol from ISIN
    // Would need a CUSIP -> Symbol mapping database
    return null;
  }

  /**
   * Detect exchange from ISIN country code
   */
  detectExchangeFromISIN(isin: string): string | null {
    if (!isin || isin.length < 2) {
      return null;
    }

    const countryCode = isin.substring(0, 2);

    const exchangeMap: Record<string, string> = {
      US: 'NASDAQ/NYSE', // United States
      FR: 'Euronext Paris', // France
      DE: 'XETRA', // Germany
      GB: 'LSE', // United Kingdom
      NL: 'Euronext Amsterdam', // Netherlands
      IT: 'Borsa Italiana', // Italy
      ES: 'BME', // Spain
      CH: 'SIX', // Switzerland
      CA: 'TSX', // Canada
      JP: 'TSE', // Japan
      HK: 'HKEX', // Hong Kong
    };

    return exchangeMap[countryCode] || null;
  }

  /**
   * Get market suffix for Twelve Data API based on ISIN
   * Some exchanges require a suffix (e.g., ".L" for London, ".PA" for Paris)
   */
  getMarketSuffixFromISIN(isin: string): string {
    if (!isin || isin.length < 2) {
      return '';
    }

    const countryCode = isin.substring(0, 2);

    const suffixMap: Record<string, string> = {
      GB: '.L', // London Stock Exchange
      FR: '.PA', // Euronext Paris
      DE: '.DE', // Deutsche Börse (XETRA)
      NL: '.AS', // Euronext Amsterdam
      IT: '.MI', // Milan Stock Exchange
      ES: '.MC', // Madrid Stock Exchange
      CH: '.SW', // SIX Swiss Exchange
      CA: '.TO', // Toronto Stock Exchange
      JP: '.T', // Tokyo Stock Exchange
      HK: '.HK', // Hong Kong Stock Exchange
    };

    return suffixMap[countryCode] || '';
  }

  /**
   * Build a symbol for API lookup from available data
   * Priority: stored symbol > extracted from name > ISIN-based lookup
   */
  buildSymbolForLookup(position: {
    symbol?: string;
    assetName: string;
    isin: string;
  }): string | null {
    // 1. Use stored symbol if available
    if (position.symbol) {
      // Add market suffix if needed (for non-US symbols)
      const suffix = this.getMarketSuffixFromISIN(position.isin);
      return position.symbol + suffix;
    }

    // 2. Try to extract from asset name
    const extractedSymbol = this.extractSymbolFromName(position.assetName);
    if (extractedSymbol) {
      const suffix = this.getMarketSuffixFromISIN(position.isin);
      return extractedSymbol + suffix;
    }

    // 3. Fall back to ISIN (Twelve Data supports ISIN lookups)
    return position.isin;
  }

  /**
   * Validate if a string looks like a valid ticker symbol
   */
  isValidSymbol(symbol: string): boolean {
    if (!symbol) {
      return false;
    }

    // Most ticker symbols are 1-5 uppercase letters
    // Some include dots for market suffixes (e.g., "BRK.B", "AAPL.L")
    return /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(symbol);
  }

  /**
   * Normalize symbol (uppercase, trim)
   */
  normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
  }
}

export default new SymbolExtractor();
