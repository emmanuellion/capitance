import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlphaVantageService } from './alphaVantageService.js';

// Mock config
vi.mock('../config/config.js', () => ({
  default: {
    alphaVantage: {
      apiKey: 'test-alpha-vantage-key',
    },
  },
}));

global.fetch = vi.fn();

describe('AlphaVantageService', () => {
  let service: AlphaVantageService;

  beforeEach(() => {
    service = new AlphaVantageService();
    vi.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', () => {
      const stats = service.getUsageStats();

      expect(stats).toEqual({
        current_usage: expect.any(Number),
        plan_limit: 500,
        period: '24h',
      });
    });
  });

  describe('getQuote', () => {
    it('should fetch quote for a valid symbol', async () => {
      const mockResponse = {
        'Global Quote': {
          '01. symbol': 'AAPL',
          '02. open': '150.00',
          '03. high': '152.00',
          '04. low': '149.00',
          '05. price': '151.50',
          '06. volume': '1000000',
          '07. latest trading day': '2024-01-15',
          '08. previous close': '150.00',
          '09. change': '1.50',
          '10. change percent': '1.0%',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getQuote('AAPL');

      expect(result).toEqual({
        symbol: 'AAPL',
        open: 150.0,
        high: 152.0,
        low: 149.0,
        price: 151.5,
        volume: 1000000,
        latestTradingDay: '2024-01-15',
        previousClose: 150.0,
        change: 1.5,
        changePercent: '1.0%',
      });
    });

    it('should return null when API returns error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 'Error Message': 'Invalid API call' }),
      });

      const result = await service.getQuote('INVALID');
      expect(result).toBeNull();
    });

    it('should return null when fetch fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getQuote('AAPL');
      expect(result).toBeNull();
    });

    it('should convert ticker format for European exchanges', async () => {
      const mockResponse = {
        'Global Quote': {
          '01. symbol': 'AI.PAR',
          '05. price': '160.50',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.getQuote('AI.PA');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=AI.PAR')
      );
    });
  });

  describe('getBatchQuotes', () => {
    it('should fetch quotes sequentially with delays', async () => {
      const mockResponse = (symbol: string) => ({
        'Global Quote': {
          '01. symbol': symbol,
          '05. price': '100.00',
        },
      });

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse('AAPL') })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse('MSFT') });

      const result = await service.getBatchQuotes(['AAPL', 'MSFT']);

      expect(result.size).toBe(2);
      expect(result.get('AAPL')).toBeDefined();
      expect(result.get('MSFT')).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    }, 20000); // Increase timeout for delays

    it('should handle empty array', async () => {
      const result = await service.getBatchQuotes([]);
      expect(result.size).toBe(0);
    });
  });
});
