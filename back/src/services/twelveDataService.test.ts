import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import TwelveDataService from './twelveDataService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('TwelveDataService', () => {
  let service: TwelveDataService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    service = new TwelveDataService(mockApiKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getQuote', () => {
    it('should fetch quote for a valid symbol', async () => {
      const mockResponse = {
        symbol: 'AAPL',
        name: 'Apple Inc',
        close: '150.00',
        change: '2.50',
        percent_change: '1.69',
        timestamp: 1234567890,
        currency: 'USD',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getQuote('AAPL');

      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc',
        price: 150.0,
        change: 2.5,
        percent_change: 1.69,
        timestamp: 1234567890,
        currency: 'USD',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('quote?symbol=AAPL')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(mockApiKey)
      );
    });

    it('should handle price field instead of close field', async () => {
      const mockResponse = {
        symbol: 'MSFT',
        name: 'Microsoft',
        price: '300.00',
        change: '5.00',
        percent_change: '1.69',
        timestamp: 1234567890,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getQuote('MSFT');

      expect(result?.price).toBe(300.0);
    });

    it('should return null for API errors (non-ok response)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await service.getQuote('INVALID');
      expect(result).toBeNull();
    });

    it('should return null for error status in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'error', code: 404, message: 'Not found' }),
      });

      const result = await service.getQuote('NOTFOUND');
      expect(result).toBeNull();
    });

    it('should return null when fetch throws an error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getQuote('AAPL');
      expect(result).toBeNull();
    });

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        symbol: 'GOOGL',
        name: 'Alphabet',
        close: '140.00',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getQuote('GOOGL');

      expect(result).toEqual({
        symbol: 'GOOGL',
        name: 'Alphabet',
        price: 140.0,
        change: 0,
        percent_change: 0,
        timestamp: expect.any(Number),
        currency: undefined,
      });
    });
  });

  describe('getBatchQuotes', () => {
    it('should fetch quotes for multiple symbols', async () => {
      const mockResponse = {
        AAPL: { price: '150.00' },
        MSFT: { price: '300.00' },
        GOOGL: { price: '140.00' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getBatchQuotes(['AAPL', 'MSFT', 'GOOGL']);

      expect(result.size).toBe(3);
      expect(result.get('AAPL')).toEqual({
        symbol: 'AAPL',
        price: 150.0,
        timestamp: expect.any(Number),
      });
      expect(result.get('MSFT')).toEqual({
        symbol: 'MSFT',
        price: 300.0,
        timestamp: expect.any(Number),
      });
      expect(result.get('GOOGL')).toEqual({
        symbol: 'GOOGL',
        price: 140.0,
        timestamp: expect.any(Number),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('price?symbol=AAPL,MSFT,GOOGL')
      );
    });

    it('should handle single symbol batch request', async () => {
      const mockResponse = {
        price: '150.00',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getBatchQuotes(['AAPL']);

      expect(result.size).toBe(1);
      expect(result.get('AAPL')).toEqual({
        symbol: 'AAPL',
        price: 150.0,
        timestamp: expect.any(Number),
      });
    });

    it('should handle empty symbol array', async () => {
      const result = await service.getBatchQuotes([]);
      expect(result.size).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should split large requests into batches (120 symbol limit)', async () => {
      const symbols = Array.from({ length: 250 }, (_, i) => `SYM${i}`);

      // Mock response for each batch
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.getBatchQuotes(symbols);

      // Should make 3 API calls (120 + 120 + 10)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should skip batch on API error but continue with others', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await service.getBatchQuotes(symbols);

      expect(result.size).toBe(0);
    });

    it('should skip symbols with missing price data', async () => {
      const mockResponse = {
        AAPL: { price: '150.00' },
        MSFT: {},  // Missing price
        GOOGL: { price: '140.00' },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getBatchQuotes(['AAPL', 'MSFT', 'GOOGL']);

      expect(result.size).toBe(2);
      expect(result.has('AAPL')).toBe(true);
      expect(result.has('MSFT')).toBe(false);
      expect(result.has('GOOGL')).toBe(true);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getBatchQuotes(['AAPL', 'MSFT']);

      expect(result.size).toBe(0);
    });
  });

  describe('resolveISINToSymbol', () => {
    it('should resolve ISIN to symbol', async () => {
      const mockResponse = {
        data: [
          { symbol: 'AAPL', instrument_name: 'Apple Inc' },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.resolveISINToSymbol('US0378331005');

      expect(result).toBe('AAPL');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol_search?symbol=US0378331005')
      );
    });

    it('should return null when no results found', async () => {
      const mockResponse = {
        data: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.resolveISINToSymbol('INVALID');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.resolveISINToSymbol('US0378331005');

      expect(result).toBeNull();
    });

    it('should return null when fetch throws', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.resolveISINToSymbol('US0378331005');

      expect(result).toBeNull();
    });
  });

  describe('getTimeSeries', () => {
    it('should fetch time series data', async () => {
      const mockResponse = {
        values: [
          { datetime: '2024-01-01', close: '150.00' },
          { datetime: '2024-01-02', close: '152.00' },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries('AAPL', '1day', 30);

      expect(result).toEqual(mockResponse.values);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('time_series?symbol=AAPL&interval=1day&outputsize=30')
      );
    });

    it('should use default parameters', async () => {
      const mockResponse = {
        values: [{ datetime: '2024-01-01', close: '150.00' }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.getTimeSeries('AAPL');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('interval=1day&outputsize=30')
      );
    });

    it('should return null on error status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'error' }),
      });

      const result = await service.getTimeSeries('AAPL');

      expect(result).toBeNull();
    });

    it('should return null when values missing', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      const result = await service.getTimeSeries('AAPL');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await service.getTimeSeries('AAPL');

      expect(result).toBeNull();
    });

    it('should return null when fetch throws', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getTimeSeries('AAPL');

      expect(result).toBeNull();
    });
  });

  describe('getApiUsage', () => {
    it('should fetch API usage stats', async () => {
      const mockUsage = {
        current_usage: 50,
        plan_limit: 800,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsage,
      });

      const result = await service.getApiUsage();

      expect(result).toEqual(mockUsage);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api_usage')
      );
    });

    it('should return null on API error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await service.getApiUsage();

      expect(result).toBeNull();
    });

    it('should return null when fetch throws', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getApiUsage();

      expect(result).toBeNull();
    });
  });
});
