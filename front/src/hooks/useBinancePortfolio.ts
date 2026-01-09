import { useState, useCallback } from 'react';
import { binanceApi, type BinancePortfolioData, type BinanceSnapshotSummary, type BinanceTimelineEntry } from '@/lib/api';

export interface UseBinancePortfolioReturn {
    // Portfolio data
    portfolio: BinancePortfolioData | null;
    portfolioLoading: boolean;
    portfolioError: string | null;
    lastFetchedAt: Date | null;

    // Snapshots data
    snapshots: BinanceSnapshotSummary[];
    snapshotsLoading: boolean;
    snapshotsError: string | null;

    // Timeline data
    timeline: BinanceTimelineEntry[];
    timelineLoading: boolean;
    timelineError: string | null;

    // Actions
    fetchPortfolio: () => Promise<void>;
    fetchSnapshots: (params?: { startDate?: Date; endDate?: Date; limit?: number }) => Promise<void>;
    fetchTimeline: (params?: { startDate?: Date; endDate?: Date }) => Promise<void>;
    createSnapshot: () => Promise<void>;
    deleteSnapshot: (snapshotId: string) => Promise<void>;
    refreshAll: () => Promise<void>;
}

export function useBinancePortfolio(): UseBinancePortfolioReturn {
    // Portfolio state
    const [portfolio, setPortfolio] = useState<BinancePortfolioData | null>(null);
    const [portfolioLoading, setPortfolioLoading] = useState(false);
    const [portfolioError, setPortfolioError] = useState<string | null>(null);
    const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

    // Snapshots state
    const [snapshots, setSnapshots] = useState<BinanceSnapshotSummary[]>([]);
    const [snapshotsLoading, setSnapshotsLoading] = useState(false);
    const [snapshotsError, setSnapshotsError] = useState<string | null>(null);

    // Timeline state
    const [timeline, setTimeline] = useState<BinanceTimelineEntry[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineError, setTimelineError] = useState<string | null>(null);

    /**
     * Fetch current portfolio from Binance
     */
    const fetchPortfolio = useCallback(async () => {
        setPortfolioLoading(true);
        setPortfolioError(null);

        try {
            const data = await binanceApi.getPortfolio();
            setPortfolio(data);
            setLastFetchedAt(new Date());
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to fetch portfolio';
            setPortfolioError(errorMessage);
            console.error('Error fetching Binance portfolio:', error);
        } finally {
            setPortfolioLoading(false);
        }
    }, []);

    /**
     * Fetch snapshots list
     */
    const fetchSnapshots = useCallback(async (params?: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }) => {
        setSnapshotsLoading(true);
        setSnapshotsError(null);

        try {
            const data = await binanceApi.getSnapshots(params);
            setSnapshots(data);
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to fetch snapshots';
            setSnapshotsError(errorMessage);
            console.error('Error fetching Binance snapshots:', error);
        } finally {
            setSnapshotsLoading(false);
        }
    }, []);

    /**
     * Fetch timeline data
     */
    const fetchTimeline = useCallback(async (params?: {
        startDate?: Date;
        endDate?: Date;
    }) => {
        setTimelineLoading(true);
        setTimelineError(null);

        try {
            const data = await binanceApi.getTimeline(params);
            setTimeline(data);
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to fetch timeline';
            setTimelineError(errorMessage);
            console.error('Error fetching Binance timeline:', error);
        } finally {
            setTimelineLoading(false);
        }
    }, []);

    /**
     * Create a manual snapshot
     */
    const createSnapshot = useCallback(async () => {
        try {
            await binanceApi.createSnapshot();
            // Refresh snapshots after creation
            await fetchSnapshots();
        } catch (error: any) {
            console.error('Error creating snapshot:', error);
            throw error;
        }
    }, [fetchSnapshots]);

    /**
     * Delete a snapshot
     */
    const deleteSnapshot = useCallback(async (snapshotId: string) => {
        try {
            await binanceApi.deleteSnapshot(snapshotId);
            // Refresh snapshots after deletion
            await fetchSnapshots();
        } catch (error: any) {
            console.error('Error deleting snapshot:', error);
            throw error;
        }
    }, [fetchSnapshots]);

    /**
     * Refresh all data (portfolio, snapshots, timeline)
     */
    const refreshAll = useCallback(async () => {
        await Promise.all([
            fetchPortfolio(),
            fetchSnapshots(),
            fetchTimeline(),
        ]);
    }, [fetchPortfolio, fetchSnapshots, fetchTimeline]);

    return {
        // Portfolio
        portfolio,
        portfolioLoading,
        portfolioError,
        lastFetchedAt,

        // Snapshots
        snapshots,
        snapshotsLoading,
        snapshotsError,

        // Timeline
        timeline,
        timelineLoading,
        timelineError,

        // Actions
        fetchPortfolio,
        fetchSnapshots,
        fetchTimeline,
        createSnapshot,
        deleteSnapshot,
        refreshAll,
    };
}
