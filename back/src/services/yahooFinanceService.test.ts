import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YahooFinanceService } from './yahooFinanceService.js';

global.fetch = vi.fn();

describe('YahooFinanceService', () => {
  let service: YahooFinanceService;

  beforeEach(() => {
    service = new YahooFinanceService();
    vi.clearAllMocks();
  });

  describe('getQuote', () => {
    it('should fetch quote for a valid symbol', async () => {
      const mockResponse = {
        chart: {
          result: [
            {
              meta: {
                symbol: 'AAPL',
                regularMarketPrice: 150.0,
                previousClose: 147.5,
                currency: 'USD',
                marketState: 'REGULAR',
              },
            },
          ],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getQuote('AAPL');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.0,
        currency: 'USD',
        previousClose: 147.5,
        change: 2.5,
        changePercent: expect.closeTo(1.69, 1),
        marketState: 'REGULAR',
      });
    });

    it('should return null when no results', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chart: { result: [] } }),
      });

      const result = await service.getQuote('INVALID');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getQuote('AAPL');
      expect(result).toBeNull();
    });
  });

  describe('getBatchQuotes', () => {
    it('should fetch multiple symbols at once', async () => {
      const mockResponseAAPL = {
        chart: {
          result: [{
            meta: {
              symbol: 'AAPL',
              regularMarketPrice: 150.0,
              previousClose: 148.0,
              currency: 'USD',
              marketState: 'REGULAR',
            },
          }],
        },
      };

      const mockResponseMSFT = {
        chart: {
          result: [{
            meta: {
              symbol: 'MSFT',
              regularMarketPrice: 300.0,
              previousClose: 295.0,
              currency: 'USD',
              marketState: 'REGULAR',
            },
          }],
        },
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseAAPL,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseMSFT,
        });

      const result = await service.getBatchQuotes(['AAPL', 'MSFT']);

      expect(result.size).toBe(2);
      expect(result.get('AAPL')?.price).toBe(150.0);
      expect(result.get('MSFT')?.price).toBe(300.0);
    });

    it('should handle empty array', async () => {
      const result = await service.getBatchQuotes([]);
      expect(result.size).toBe(0);
    });

    it('should skip symbols with missing data', async () => {
      const mockResponseAAPL = {
        chart: {
          result: [{
            meta: {
              symbol: 'AAPL',
              regularMarketPrice: 150.0,
              previousClose: 148.0,
              currency: 'USD',
            },
          }],
        },
      };

      const mockResponseInvalid = {
        chart: {
          result: [{
            meta: {
              symbol: 'INVALID',
              // Missing regularMarketPrice
            },
          }],
        },
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseAAPL,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponseInvalid,
        });

      const result = await service.getBatchQuotes(['AAPL', 'INVALID']);

      expect(result.size).toBe(1);
      expect(result.has('AAPL')).toBe(true);
      expect(result.has('INVALID')).toBe(false);
    });
  });
});
