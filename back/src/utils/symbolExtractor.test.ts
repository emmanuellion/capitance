import { describe, it, expect } from 'vitest';
import symbolExtractor from './symbolExtractor';

describe('SymbolExtractor', () => {
  describe('extractSymbolFromName', () => {
    it('should extract symbol from parentheses format', () => {
      expect(symbolExtractor.extractSymbolFromName('Apple Inc. (AAPL)')).toBe('AAPL');
      expect(symbolExtractor.extractSymbolFromName('Microsoft Corporation (MSFT)')).toBe('MSFT');
      expect(symbolExtractor.extractSymbolFromName('Tesla Inc (TSLA)')).toBe('TSLA');
    });

    it('should extract symbol from square brackets format', () => {
      expect(symbolExtractor.extractSymbolFromName('Microsoft Corporation [MSFT]')).toBe('MSFT');
      expect(symbolExtractor.extractSymbolFromName('Apple [AAPL]')).toBe('AAPL');
    });

    it('should extract symbol after dash', () => {
      expect(symbolExtractor.extractSymbolFromName('Tesla Inc - TSLA')).toBe('TSLA');
      expect(symbolExtractor.extractSymbolFromName('Amazon.com Inc – AMZN')).toBe('AMZN');
    });

    it('should extract symbol at the end after whitespace', () => {
      expect(symbolExtractor.extractSymbolFromName('AMAZON.COM INC. AMZN')).toBe('AMZN');
    });

    it('should recognize when whole name is a symbol', () => {
      expect(symbolExtractor.extractSymbolFromName('AAPL')).toBe('AAPL');
      expect(symbolExtractor.extractSymbolFromName('MSFT')).toBe('MSFT');
      expect(symbolExtractor.extractSymbolFromName('GOOGL')).toBe('GOOGL');
    });

    it('should return null when no symbol found', () => {
      expect(symbolExtractor.extractSymbolFromName('Some Company Name')).toBeNull();
      expect(symbolExtractor.extractSymbolFromName('Société Générale')).toBeNull();
      expect(symbolExtractor.extractSymbolFromName('')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(symbolExtractor.extractSymbolFromName('Apple Inc. (123)')).toBeNull(); // Numbers not valid
      expect(symbolExtractor.extractSymbolFromName('Company (TOOLONG)')).toBeNull(); // Too long
      expect(symbolExtractor.extractSymbolFromName('Company (A)')).toBe('A'); // Single letter valid
    });
  });

  describe('detectExchangeFromISIN', () => {
    it('should detect US exchanges', () => {
      expect(symbolExtractor.detectExchangeFromISIN('US0378331005')).toBe('NASDAQ/NYSE');
    });

    it('should detect French exchanges', () => {
      expect(symbolExtractor.detectExchangeFromISIN('FR0000120073')).toBe('Euronext Paris');
    });

    it('should detect German exchanges', () => {
      expect(symbolExtractor.detectExchangeFromISIN('DE0005140008')).toBe('XETRA');
    });

    it('should return null for unknown country codes', () => {
      expect(symbolExtractor.detectExchangeFromISIN('XX0000000000')).toBeNull();
    });

    it('should return null for invalid ISINs', () => {
      expect(symbolExtractor.detectExchangeFromISIN('')).toBeNull();
      expect(symbolExtractor.detectExchangeFromISIN('X')).toBeNull();
    });
  });

  describe('getMarketSuffixFromISIN', () => {
    it('should return correct suffix for UK', () => {
      expect(symbolExtractor.getMarketSuffixFromISIN('GB0002374006')).toBe('.L');
    });

    it('should return correct suffix for France', () => {
      expect(symbolExtractor.getMarketSuffixFromISIN('FR0000120073')).toBe('.PA');
    });

    it('should return correct suffix for Germany', () => {
      expect(symbolExtractor.getMarketSuffixFromISIN('DE0005140008')).toBe('.DE');
    });

    it('should return empty string for US (no suffix needed)', () => {
      expect(symbolExtractor.getMarketSuffixFromISIN('US0378331005')).toBe('');
    });

    it('should return empty string for unknown countries', () => {
      expect(symbolExtractor.getMarketSuffixFromISIN('XX0000000000')).toBe('');
    });
  });

  describe('buildSymbolForLookup', () => {
    it('should use stored symbol with market suffix', () => {
      const result = symbolExtractor.buildSymbolForLookup({
        symbol: 'LVMH',
        assetName: 'LVMH Moët Hennessy',
        isin: 'FR0000121014',
      });
      expect(result).toBe('LVMH.PA');
    });

    it('should extract from asset name when no stored symbol', () => {
      const result = symbolExtractor.buildSymbolForLookup({
        assetName: 'Apple Inc. (AAPL)',
        isin: 'US0378331005',
      });
      expect(result).toBe('AAPL');
    });

    it('should fall back to ISIN when nothing else works', () => {
      const result = symbolExtractor.buildSymbolForLookup({
        assetName: 'Some Company',
        isin: 'FR0000120073',
      });
      expect(result).toBe('FR0000120073');
    });

    it('should not add suffix for US stocks', () => {
      const result = symbolExtractor.buildSymbolForLookup({
        symbol: 'AAPL',
        assetName: 'Apple Inc.',
        isin: 'US0378331005',
      });
      expect(result).toBe('AAPL');
    });
  });

  describe('isValidSymbol', () => {
    it('should validate correct symbols', () => {
      expect(symbolExtractor.isValidSymbol('AAPL')).toBe(true);
      expect(symbolExtractor.isValidSymbol('MSFT')).toBe(true);
      expect(symbolExtractor.isValidSymbol('GOOGL')).toBe(true);
      expect(symbolExtractor.isValidSymbol('BRK.B')).toBe(true);
      expect(symbolExtractor.isValidSymbol('LVMH.PA')).toBe(true);
    });

    it('should reject invalid symbols', () => {
      expect(symbolExtractor.isValidSymbol('aapl')).toBe(false); // Lowercase
      expect(symbolExtractor.isValidSymbol('TOOLONG')).toBe(false); // Too long
      expect(symbolExtractor.isValidSymbol('ABC123')).toBe(false); // Numbers
      expect(symbolExtractor.isValidSymbol('A-B')).toBe(false); // Invalid chars
      expect(symbolExtractor.isValidSymbol('')).toBe(false); // Empty
    });
  });

  describe('normalizeSymbol', () => {
    it('should normalize symbols to uppercase', () => {
      expect(symbolExtractor.normalizeSymbol('aapl')).toBe('AAPL');
      expect(symbolExtractor.normalizeSymbol('msft')).toBe('MSFT');
    });

    it('should trim whitespace', () => {
      expect(symbolExtractor.normalizeSymbol(' AAPL ')).toBe('AAPL');
      expect(symbolExtractor.normalizeSymbol('  MSFT  ')).toBe('MSFT');
    });

    it('should handle already normalized symbols', () => {
      expect(symbolExtractor.normalizeSymbol('AAPL')).toBe('AAPL');
    });
  });
});
