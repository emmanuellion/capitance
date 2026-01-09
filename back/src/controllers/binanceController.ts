import type { Request, Response, NextFunction } from 'express';
import {
    fetchPortfolio,
    validateApiKeys,
    clearPortfolioCache,
    BinanceServiceError,
} from '../services/binanceService.js';
import {
    updateBinanceCredentials,
    removeBinanceCredentials,
    hasBinanceApiKeys,
    findUserById,
} from '../models/User.js';
import {
    createBinanceSnapshot,
    getBinanceSnapshotSummaries,
    getBinanceSnapshotById,
    deleteBinanceSnapshot,
    getBinancePortfolioTimeline,
} from '../models/BinanceSnapshot.js';
import { maskSensitiveData } from '../utils/encryption.js';
import logger from '../utils/logger.js';

// ==================== Helper Functions ====================

function handleBinanceServiceError(error: BinanceServiceError, res: Response): void {
    const statusMap: Record<string, number> = {
        KEYS_NOT_CONFIGURED: 400,
        BINANCE_INVALID_KEYS: 400,
        BINANCE_RATE_LIMIT: 429,
        BINANCE_TIMEOUT: 504,
        BINANCE_API_ERROR: 502,
        INTERNAL_ERROR: 500,
    };

    const status = statusMap[error.code] || 500;

    res.status(status).json({
        success: false,
        message: error.message,
        code: error.code,
        binanceError: error.binanceError,
    });
}

// ==================== Controller Functions ====================

/**
 * POST /api/v1/binance/api-keys
 * Set or update Binance API keys for the authenticated user
 */
export async function setApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { apiKey, apiSecret } = req.body;

        logger.info(`Setting Binance API keys for user ${userId}`);

        // Validate keys with Binance first
        const validation = await validateApiKeys(apiKey, apiSecret);

        if (!validation.valid) {
            res.status(400).json({
                success: false,
                message: validation.error || 'Invalid API keys',
                code: 'BINANCE_INVALID_KEYS',
                binanceError: validation.binanceError,
            });
            return;
        }

        // Save encrypted credentials
        const updated = await updateBinanceCredentials(userId, apiKey, apiSecret);

        if (!updated) {
            res.status(500).json({
                success: false,
                message: 'Failed to save API keys',
                code: 'INTERNAL_ERROR',
            });
            return;
        }

        // Clear any cached portfolio data
        await clearPortfolioCache(userId);

        logger.info(`Binance API keys saved successfully for user ${userId}`);

        res.status(200).json({
            success: true,
            message: 'API keys configured successfully',
            data: {
                maskedApiKey: maskSensitiveData(apiKey),
                configuredAt: new Date(),
            },
        });
    } catch (error) {
        logger.error('Error setting Binance API keys', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * DELETE /api/v1/binance/api-keys
 * Remove Binance API keys for the authenticated user
 */
export async function deleteApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;

        logger.info(`Deleting Binance API keys for user ${userId}`);

        const removed = await removeBinanceCredentials(userId);

        if (!removed) {
            res.status(404).json({
                success: false,
                message: 'No API keys found to delete',
                code: 'KEYS_NOT_FOUND',
            });
            return;
        }

        // Clear cached portfolio data
        await clearPortfolioCache(userId);

        logger.info(`Binance API keys deleted successfully for user ${userId}`);

        res.status(200).json({
            success: true,
            message: 'API keys deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting Binance API keys', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * GET /api/v1/binance/keys-status
 * Check if user has Binance API keys configured
 */
export async function getApiKeysStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;

        const hasKeys = await hasBinanceApiKeys(userId);

        if (!hasKeys) {
            res.status(200).json({
                success: true,
                data: {
                    configured: false,
                    configuredAt: null,
                },
            });
            return;
        }

        // Get user to retrieve configured date
        const user = await findUserById(userId);
        const configuredAt = user?.binanceApiConfiguredAt || null;

        res.status(200).json({
            success: true,
            data: {
                configured: true,
                configuredAt,
            },
        });
    } catch (error) {
        logger.error('Error checking Binance API keys status', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * GET /api/v1/binance/portfolio
 * Fetch current Binance portfolio for the authenticated user
 */
export async function getPortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;

        logger.info(`Fetching Binance portfolio for user ${userId}`);

        const portfolioData = await fetchPortfolio(userId);

        // Set cache headers (private, max-age 5 minutes)
        res.setHeader('Cache-Control', 'private, max-age=300');

        res.status(200).json({
            success: true,
            data: portfolioData,
        });
    } catch (error) {
        if (error instanceof BinanceServiceError) {
            handleBinanceServiceError(error, res);
            return;
        }

        logger.error('Error fetching Binance portfolio', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * GET /api/v1/binance/snapshots
 * Get list of saved Binance snapshots for the authenticated user
 */
export async function getSnapshots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { startDate, endDate, limit, offset } = req.query;

        const options: any = {
            skip: offset ? parseInt(offset as string, 10) : 0,
            limit: limit ? parseInt(limit as string, 10) : 100,
        };

        if (startDate) {
            options.startDate = new Date(startDate as string);
        }

        if (endDate) {
            options.endDate = new Date(endDate as string);
        }

        const snapshots = await getBinanceSnapshotSummaries(userId, options);

        res.status(200).json({
            success: true,
            data: snapshots,
        });
    } catch (error) {
        logger.error('Error fetching Binance snapshots', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * GET /api/v1/binance/snapshots/:snapshotId
 * Get a specific snapshot by ID
 */
export async function getSnapshotById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { snapshotId } = req.params;

        const snapshot = await getBinanceSnapshotById(snapshotId, userId);

        if (!snapshot) {
            res.status(404).json({
                success: false,
                message: 'Snapshot not found',
                code: 'SNAPSHOT_NOT_FOUND',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: snapshot,
        });
    } catch (error) {
        logger.error('Error fetching Binance snapshot', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * POST /api/v1/binance/snapshots
 * Create a manual snapshot of current Binance portfolio
 */
export async function createSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;

        logger.info(`Creating manual Binance snapshot for user ${userId}`);

        // Fetch current portfolio
        const portfolioData = await fetchPortfolio(userId);

        // Create snapshot
        const snapshotId = await createBinanceSnapshot(userId, portfolioData);

        logger.info(`Binance snapshot created successfully for user ${userId}`, { snapshotId });

        res.status(201).json({
            success: true,
            message: 'Snapshot created successfully',
            data: {
                snapshotId: snapshotId.toString(),
                snapshotDate: new Date(),
            },
        });
    } catch (error) {
        if (error instanceof BinanceServiceError) {
            handleBinanceServiceError(error, res);
            return;
        }

        logger.error('Error creating Binance snapshot', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * DELETE /api/v1/binance/snapshots/:snapshotId
 * Delete a specific snapshot
 */
export async function deleteSnapshotById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { snapshotId } = req.params;

        const deleted = await deleteBinanceSnapshot(snapshotId, userId);

        if (!deleted) {
            res.status(404).json({
                success: false,
                message: 'Snapshot not found',
                code: 'SNAPSHOT_NOT_FOUND',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Snapshot deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting Binance snapshot', { error, userId: req.user?.userId });
        next(error);
    }
}

/**
 * GET /api/v1/binance/timeline
 * Get portfolio evolution timeline
 */
export async function getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.userId;
        const { startDate, endDate } = req.query;

        const options: any = {};

        if (startDate) {
            options.startDate = new Date(startDate as string);
        }

        if (endDate) {
            options.endDate = new Date(endDate as string);
        }

        const timeline = await getBinancePortfolioTimeline(userId, options);

        res.status(200).json({
            success: true,
            data: timeline,
        });
    } catch (error) {
        logger.error('Error fetching Binance timeline', { error, userId: req.user?.userId });
        next(error);
    }
}
