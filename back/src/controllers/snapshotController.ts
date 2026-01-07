import type { Request, Response, NextFunction } from 'express';
import {
  getSnapshotById,
  getSnapshotsByUserId,
  deleteSnapshotById,
  getSnapshotByUploadId,
  type GetSnapshotsOptions,
} from '../models/PortfolioSnapshot.js';
import { getTimelineAggregation, getPositionHistory, processUpload } from '../services/snapshotService.js';
import { getUploadsByUserId, updateUpload } from '../models/Upload.js';
import logger from '../utils/logger.js';
import { cacheService } from '../services/cacheService.js';

// Get all snapshots for user with filters
export const getSnapshots = async (
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

    const options: GetSnapshotsOptions = {};

    if (req.query.startDate) {
      options.startDate = new Date(req.query.startDate as string);
    }

    if (req.query.endDate) {
      options.endDate = new Date(req.query.endDate as string);
    }

    if (req.query.formatType) {
      options.formatType = req.query.formatType as string;
    }

    if (req.query.limit) {
      options.limit = parseInt(req.query.limit as string, 10);
    }

    if (req.query.offset) {
      options.offset = parseInt(req.query.offset as string, 10);
    }

    // Build cache key from options
    const cacheKey = `snapshots:user:${req.user.userId}:${JSON.stringify(options)}`;

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: cached,
        count: (cached as any[]).length,
        cached: true,
      });
      return;
    }

    const snapshots = await getSnapshotsByUserId(req.user.userId, options);

    // Cache result for 5 minutes
    await cacheService.set(cacheKey, snapshots, 300);

    res.status(200).json({
      success: true,
      data: snapshots,
      count: snapshots.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get single snapshot by ID
export const getSnapshot = async (
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

    // Try cache first (longer TTL for individual snapshots)
    const cacheKey = `snapshots:user:${req.user.userId}:id:${snapshotId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: cached,
        cached: true,
      });
      return;
    }

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

    // Cache for 1 hour
    await cacheService.set(cacheKey, snapshot, 3600);

    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    next(error);
  }
};

// Get timeline aggregation
export const getTimeline = async (
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

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Build cache key
    const cacheKey = `timeline:user:${req.user.userId}:${startDate?.toISOString() || 'all'}:${endDate?.toISOString() || 'all'}`;

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: cached,
        cached: true,
      });
      return;
    }

    const timeline = await getTimelineAggregation(req.user.userId, startDate, endDate);

    // Cache for 1 hour
    await cacheService.set(cacheKey, timeline, 3600);

    res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
};

// Get position history for specific ISIN
export const getPosition = async (
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

    const { isin } = req.params;

    // Build cache key
    const cacheKey = `position:user:${req.user.userId}:isin:${isin}`;

    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        data: cached,
        cached: true,
      });
      return;
    }

    const history = await getPositionHistory(req.user.userId, isin);

    // Cache for 1 hour
    await cacheService.set(cacheKey, history, 3600);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// Reprocess all uploads to create/update snapshots
export const reprocessAllUploads = async (
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

    const uploads = await getUploadsByUserId(req.user.userId);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ filename: string; error: string }> = [];

    for (const upload of uploads) {
      try {
        // Check if snapshot already exists
        const existingSnapshot = await getSnapshotByUploadId(upload._id!.toString());

        if (existingSnapshot) {
          successCount++;
          continue; // Skip if already processed
        }

        // Process upload
        const snapshotResult = await processUpload(
          upload.filePath,
          req.user.userId,
          upload._id!,
          upload.originalName
        );

        // Update upload with processing results
        await updateUpload(upload._id!, {
          formatType: snapshotResult.parseResult.metadata.formatType,
          formatDetectionConfidence: snapshotResult.detection?.confidence,
          snapshotDate: snapshotResult.snapshot.snapshotDate,
          processingStatus: 'processed',
        });

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          filename: upload.originalName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.error('Failed to process upload', { uploadId: upload._id?.toString(), filename: upload.originalName, error });
      }
    }

    // Invalidate all cache for this user
    await cacheService.delete(`snapshots:user:${req.user.userId}:*`);
    await cacheService.delete(`timeline:user:${req.user.userId}:*`);
    await cacheService.delete(`position:user:${req.user.userId}:*`);

    res.status(200).json({
      success: true,
      message: `Processed ${successCount} files, ${errorCount} errors`,
      data: {
        successCount,
        errorCount,
        totalFiles: uploads.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete snapshot
export const deleteSnapshot = async (
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

    // Verify ownership
    const snapshot = await getSnapshotById(snapshotId);
    if (snapshot && snapshot.userId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
      return;
    }

    const deleted = await deleteSnapshotById(snapshotId);

    // Invalidate all cache for this user
    await cacheService.delete(`snapshots:user:${req.user.userId}:*`);
    await cacheService.delete(`timeline:user:${req.user.userId}:*`);
    await cacheService.delete(`position:user:${req.user.userId}:*`);

    res.status(200).json({
      success: true,
      message: deleted ? 'Snapshot deleted' : 'Snapshot not found',
    });
  } catch (error) {
    next(error);
  }
};
