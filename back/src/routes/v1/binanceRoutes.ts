import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyCsrfToken } from '../../middleware/csrf.js';
import { validateBinanceApiKeys } from '../../utils/validation.js';
import {
    setApiKeys,
    deleteApiKeys,
    getApiKeysStatus,
    getPortfolio,
    getSnapshots,
    getSnapshotById,
    createSnapshot,
    deleteSnapshotById,
    getTimeline,
} from '../../controllers/binanceController.js';

const router = Router();

// All routes require authentication
router.use(verifyAuth);

// ==================== Rate Limiters ====================

// Strict rate limit for API key validation (5 requests per hour per user)
const apiKeyValidationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 requests per hour
    message: {
        success: false,
        message: 'Too many API key validation attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use userId for rate limiting
    keyGenerator: (req) => req.user!.userId,
});

// Moderate rate limit for portfolio fetches (20 requests per 5 minutes per user)
const portfolioFetchLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 requests per 5 minutes
    message: {
        success: false,
        message: 'Too many portfolio fetch requests. Please wait a moment.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user!.userId,
});

// ==================== API Keys Management ====================

/**
 * POST /api/v1/binance/api-keys
 * Set or update Binance API keys
 * Rate limited: 5 requests per hour
 */
router.post(
    '/api-keys',
    apiKeyValidationLimiter,
    verifyCsrfToken,
    validateBinanceApiKeys,
    setApiKeys
);

/**
 * DELETE /api/v1/binance/api-keys
 * Remove Binance API keys
 */
router.delete(
    '/api-keys',
    verifyCsrfToken,
    deleteApiKeys
);

/**
 * GET /api/v1/binance/keys-status
 * Check if API keys are configured
 */
router.get('/keys-status', getApiKeysStatus);

// ==================== Portfolio ====================

/**
 * GET /api/v1/binance/portfolio
 * Fetch current Binance portfolio
 * Rate limited: 20 requests per 5 minutes
 */
router.get('/portfolio', portfolioFetchLimiter, getPortfolio);

// ==================== Snapshots ====================

/**
 * GET /api/v1/binance/snapshots
 * Get list of saved snapshots
 * Query params: startDate, endDate, limit, offset
 */
router.get('/snapshots', getSnapshots);

/**
 * GET /api/v1/binance/snapshots/:snapshotId
 * Get a specific snapshot by ID
 */
router.get('/snapshots/:snapshotId', getSnapshotById);

/**
 * POST /api/v1/binance/snapshots
 * Create a manual snapshot of current portfolio
 */
router.post(
    '/snapshots',
    verifyCsrfToken,
    portfolioFetchLimiter,
    createSnapshot
);

/**
 * DELETE /api/v1/binance/snapshots/:snapshotId
 * Delete a specific snapshot
 */
router.delete(
    '/snapshots/:snapshotId',
    verifyCsrfToken,
    deleteSnapshotById
);

// ==================== Timeline ====================

/**
 * GET /api/v1/binance/timeline
 * Get portfolio evolution timeline
 * Query params: startDate, endDate
 */
router.get('/timeline', getTimeline);

export default router;
