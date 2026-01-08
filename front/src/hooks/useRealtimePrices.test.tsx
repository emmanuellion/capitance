import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEnrichedSnapshot,
  useLatestEnrichedSnapshot,
  usePerformanceSummary,
  useSignificantChanges,
  useWorkerStats,
  useCacheStats,
  useRefreshPrices,
  useClearPriceCache,
} from './useRealtimePrices';
import { server } from '@/test/mocks/server';
import { createTestQueryClient } from '@/test/utils';

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

const createWrapper = () => {
  const queryClient = createTestQueryClient();

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useRealtimePrices hooks', () => {
  describe('useEnrichedSnapshot', () => {
    it('should fetch enriched snapshot data', async () => {
      const { result } = renderHook(
        () => useEnrichedSnapshot('snapshot-123'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(result.current.data?._id).toBe('snapshot-123');
      expect(result.current.data?.positions).toHaveLength(1);
      expect(result.current.data?.realtimeTotalValue).toBe(1550.0);
    });

    it('should not fetch when snapshotId is null', () => {
      const { result } = renderHook(
        () => useEnrichedSnapshot(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(
        () => useEnrichedSnapshot('snapshot-123', false),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useLatestEnrichedSnapshot', () => {
    it('should fetch latest enriched snapshot', async () => {
      const { result } = renderHook(
        () => useLatestEnrichedSnapshot(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(result.current.data?._id).toBe('snapshot-123');
    });

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(
        () => useLatestEnrichedSnapshot(false),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('usePerformanceSummary', () => {
    it('should fetch performance summary', async () => {
      const { result } = renderHook(
        () => usePerformanceSummary('snapshot-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.snapshot.totalValue).toBe(10000);
      expect(result.current.data?.realtime.totalValue).toBe(10500);
      expect(result.current.data?.change.valueChange).toBe(500);
    });

    it('should not fetch when snapshotId is null', () => {
      const { result } = renderHook(
        () => usePerformanceSummary(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useSignificantChanges', () => {
    it('should fetch significant changes with default threshold', async () => {
      const { result } = renderHook(
        () => useSignificantChanges('snapshot-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      // Data is an array of EnrichedPosition
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].symbol).toBe('AAPL');
    });

    it('should fetch significant changes with custom threshold', async () => {
      const { result } = renderHook(
        () => useSignificantChanges('snapshot-123', 5.0),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      // Data is an array of EnrichedPosition
      expect(result.current.data).toHaveLength(1);
    });

    it('should not fetch when snapshotId is null', () => {
      const { result } = renderHook(
        () => useSignificantChanges(null),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useWorkerStats', () => {
    it('should fetch worker statistics', async () => {
      const { result } = renderHook(
        () => useWorkerStats(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.uniqueSymbols).toBe(25);
      expect(result.current.data?.pricesUpdated).toBe(25);
      expect(result.current.data?.isRunning).toBe(false);
    });

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(
        () => useWorkerStats(false),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useCacheStats', () => {
    it('should fetch cache statistics', async () => {
      const { result } = renderHook(
        () => useCacheStats(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.totalPrices).toBe(150);
      expect(result.current.data?.apiUsage).toBeDefined();
    });
  });

  describe('useRefreshPrices', () => {
    it('should trigger price refresh', async () => {
      const { result } = renderHook(
        () => useRefreshPrices(),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Mutation doesn't return data, just succeeds
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('useClearPriceCache', () => {
    it('should clear cache without symbols', async () => {
      const { result } = renderHook(
        () => useClearPriceCache(),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Mutation doesn't return data, just succeeds
      expect(result.current.isSuccess).toBe(true);
    });

    it('should clear cache with specific symbols', async () => {
      const { result } = renderHook(
        () => useClearPriceCache(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(['AAPL', 'MSFT', 'GOOGL']);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Mutation doesn't return data, just succeeds
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
