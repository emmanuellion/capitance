import type { Request, Response, NextFunction } from 'express';
import { getSnapshotById, getSnapshotsByUserId } from '../models/PortfolioSnapshot.js';
import snapshotEnrichment from '../services/snapshotEnrichment.js';
import priceCache from '../services/priceCache.js';
import priceUpdateWorker from '../services/priceUpdateWorker.js';
import logger from '../utils/logger.js';

/**
 * Get snapshot with real-time prices
 */
export const getEnrichedSnapshot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { snapshotId } = req.params;

    const snapshot = await getSnapshotById(snapshotId);

    if (!snapshot) {
      res.status(404).json({
        success: false,
        message: 'Snapshot not found',
      });
      return;
    }

    // Verify ownership
    if (snapshot.userId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
      return;
    }

    // Enrich with real-time prices
    const enriched = await snapshotEnrichment.enrichSnapshot(snapshot);

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    logger.error('Error getting enriched snapshot', { error });
    next(error);
  }
};

/**
 * Get latest snapshot with real-time prices
 */
export const getLatestEnrichedSnapshot = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Get the latest snapshot for this user
    const snapshots = await getSnapshotsByUserId(req.user.userId, { limit: 1 });

    if (snapshots.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No snapshots found',
      });
      return;
    }

    const snapshot = snapshots[0];

    // Enrich with real-time prices
    const enriched = await snapshotEnrichment.enrichSnapshot(snapshot);

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    logger.error('Error getting latest enriched snapshot', { error });
    next(error);
  }
};

/**
 * Get portfolio performance summary with real-time data
 */
export const getPerformanceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { snapshotId } = req.params;

    const snapshot = await getSnapshotById(snapshotId);

    if (!snapshot) {
      res.status(404).json({
        success: false,
        message: 'Snapshot not found',
      });
      return;
    }

    // Verify ownership
    if (snapshot.userId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
      return;
    }

    // Get performance summary
    const summary = await snapshotEnrichment.getPortfolioPerformanceSummary(snapshot);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Error getting performance summary', { error });
    next(error);
  }
};

/**
 * Get positions with significant price changes
 */
export const getSignificantChanges = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { snapshotId } = req.params;
    const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 2.0;

    const snapshot = await getSnapshotById(snapshotId);

    if (!snapshot) {
      res.status(404).json({
        success: false,
        message: 'Snapshot not found',
      });
      return;
    }

    // Verify ownership
    if (snapshot.userId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
      return;
    }

    // Get positions with significant changes
    const changes = await snapshotEnrichment.getSignificantChanges(snapshot, threshold);

    res.status(200).json({
      success: true,
      data: changes,
      count: changes.length,
      threshold,
    });
  } catch (error) {
    logger.error('Error getting significant changes', { error });
    next(error);
  }
};

/**
 * Get price update worker statistics
 */
export const getWorkerStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const stats = priceUpdateWorker.getStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting worker stats', { error });
    next(error);
  }
};

/**
 * Get price cache statistics
 */
export const getCacheStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const stats = await priceCache.getCacheStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting cache stats', { error });
    next(error);
  }
};

/**
 * Force refresh prices (manual trigger)
 * Admin/debug endpoint
 */
export const forceRefreshPrices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    logger.info('Manual price refresh triggered', { userId: req.user.userId });

    // Trigger worker update
    await priceUpdateWorker.forceUpdate();

    res.status(200).json({
      success: true,
      message: 'Price refresh triggered',
    });
  } catch (error) {
    logger.error('Error forcing price refresh', { error });
    next(error);
  }
};

/**
 * Clear price cache
 * Admin/debug endpoint
 */
export const clearPriceCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const symbols = req.body.symbols as string[] | undefined;

    await priceCache.clearCache(symbols);

    res.status(200).json({
      success: true,
      message: symbols ? `Cleared cache for ${symbols.length} symbols` : 'Cleared all price cache',
    });
  } catch (error) {
    logger.error('Error clearing price cache', { error });
    next(error);
  }
};
