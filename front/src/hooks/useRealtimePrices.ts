import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types for real-time data
export interface EnrichedPosition {
  isin: string;
  assetName: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  averageBuyingPrice: number;
  totalInvested: number;
  gainLoss: number;
  gainLossPercentage: number;

  // Real-time data
  realtimePrice?: number;
  realtimeValue?: number;
  realtimeGainLoss?: number;
  realtimeGainLossPercentage?: number;
  priceLastUpdated?: Date;

  // Comparison
  priceDifference?: number;
  priceDifferencePercentage?: number;

  // Metadata
  currency?: string;
  exchange?: string;
  symbol?: string;
}

export interface EnrichedSnapshot {
  _id: string;
  uploadId: string;
  userId: string;
  snapshotDate: Date;
  positions: EnrichedPosition[];
  metadata: any;

  // Original totals
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;

  // Real-time totals
  realtimeTotalValue?: number;
  realtimeTotalGainLoss?: number;
  realtimeTotalGainLossPercentage?: number;

  // Comparison
  totalValueDifference?: number;
  totalValueDifferencePercentage?: number;

  // Metadata
  enrichedAt: Date;
  pricesAvailable: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PerformanceSummary {
  snapshot: {
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
  };
  realtime: {
    totalValue: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
  };
  change: {
    valueChange: number;
    valueChangePercentage: number;
  };
  metadata: {
    snapshotDate: Date;
    enrichedAt: Date;
    pricesAvailable: number;
    totalPositions: number;
  };
}

export interface WorkerStats {
  lastRun?: Date;
  nextRun?: Date;
  uniqueSymbols: number;
  pricesUpdated: number;
  errors: number;
  isRunning: boolean;
}

export interface CacheStats {
  totalPrices: number;
  totalMappings: number;
  apiUsage?: any;
}

/**
 * Hook to fetch enriched snapshot with real-time prices
 */
export function useEnrichedSnapshot(snapshotId: string | null, enabled: boolean = true) {
  return useQuery<EnrichedSnapshot>({
    queryKey: ['enrichedSnapshot', snapshotId],
    queryFn: async () => {
      if (!snapshotId) throw new Error('No snapshot ID provided');
      const response = await api.get<EnrichedSnapshot>(`/api/v1/realtime/snapshots/${snapshotId}`);
      return response.data!;
    },
    enabled: enabled && !!snapshotId,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes to get latest prices
    staleTime: 1 * 60 * 1000, // Consider data stale after 1 minute
  });
}

/**
 * Hook to fetch the latest enriched snapshot
 */
export function useLatestEnrichedSnapshot(enabled: boolean = true) {
  return useQuery<EnrichedSnapshot>({
    queryKey: ['latestEnrichedSnapshot'],
    queryFn: async () => {
      const response = await api.get<EnrichedSnapshot>('/api/v1/realtime/snapshots/latest');
      return response.data!;
    },
    enabled,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to fetch performance summary with real-time data
 */
export function usePerformanceSummary(snapshotId: string | null, enabled: boolean = true) {
  return useQuery<PerformanceSummary>({
    queryKey: ['performanceSummary', snapshotId],
    queryFn: async () => {
      if (!snapshotId) throw new Error('No snapshot ID provided');
      const response = await api.get<PerformanceSummary>(`/api/v1/realtime/snapshots/${snapshotId}/performance`);
      return response.data!;
    },
    enabled: enabled && !!snapshotId,
    refetchInterval: 2 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to fetch positions with significant price changes
 */
export function useSignificantChanges(
  snapshotId: string | null,
  threshold: number = 2.0,
  enabled: boolean = true
) {
  return useQuery<EnrichedPosition[]>({
    queryKey: ['significantChanges', snapshotId, threshold],
    queryFn: async () => {
      if (!snapshotId) throw new Error('No snapshot ID provided');
      const response = await api.get<EnrichedPosition[]>(
        `/api/v1/realtime/snapshots/${snapshotId}/changes?threshold=${threshold}`
      );
      return response.data!;
    },
    enabled: enabled && !!snapshotId,
    refetchInterval: 2 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook to fetch worker statistics
 */
export function useWorkerStats(enabled: boolean = true) {
  return useQuery<WorkerStats>({
    queryKey: ['workerStats'],
    queryFn: async () => {
      const response = await api.get<WorkerStats>('/api/v1/realtime/worker/stats');
      return response.data!;
    },
    enabled,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch cache statistics
 */
export function useCacheStats(enabled: boolean = true) {
  return useQuery<CacheStats>({
    queryKey: ['cacheStats'],
    queryFn: async () => {
      const response = await api.get<CacheStats>('/api/v1/realtime/cache/stats');
      return response.data!;
    },
    enabled,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to manually trigger price refresh
 */
export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/realtime/refresh');
    },
    onSuccess: () => {
      // Invalidate all real-time queries to refetch with new prices
      queryClient.invalidateQueries({ queryKey: ['enrichedSnapshot'] });
      queryClient.invalidateQueries({ queryKey: ['latestEnrichedSnapshot'] });
      queryClient.invalidateQueries({ queryKey: ['performanceSummary'] });
      queryClient.invalidateQueries({ queryKey: ['significantChanges'] });
    },
  });
}

/**
 * Hook to clear price cache
 */
export function useClearPriceCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (symbols?: string[]) => {
      await api.post('/api/v1/realtime/cache/clear', { symbols });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cacheStats'] });
    },
  });
}
