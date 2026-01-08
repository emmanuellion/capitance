import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyCsrfToken } from '../../middleware/csrf.js';
import {
  getEnrichedSnapshot,
  getLatestEnrichedSnapshot,
  getPerformanceSummary,
  getSignificantChanges,
  getWorkerStats,
  getCacheStats,
  forceRefreshPrices,
  clearPriceCache,
} from '../../controllers/realtimePriceController.js';

const router = Router();

// All routes require authentication
router.use(verifyAuth);

/**
 * GET /api/v1/realtime/snapshots/latest
 * Get latest snapshot with real-time prices
 */
router.get('/snapshots/latest', getLatestEnrichedSnapshot);

/**
 * GET /api/v1/realtime/snapshots/:snapshotId
 * Get specific snapshot with real-time prices
 */
router.get('/snapshots/:snapshotId', getEnrichedSnapshot);

/**
 * GET /api/v1/realtime/snapshots/:snapshotId/performance
 * Get portfolio performance summary with real-time data
 */
router.get('/snapshots/:snapshotId/performance', getPerformanceSummary);

/**
 * GET /api/v1/realtime/snapshots/:snapshotId/changes
 * Get positions with significant price changes
 * Query params: threshold (default: 2.0)
 */
router.get('/snapshots/:snapshotId/changes', getSignificantChanges);

/**
 * GET /api/v1/realtime/worker/stats
 * Get price update worker statistics
 */
router.get('/worker/stats', getWorkerStats);

/**
 * GET /api/v1/realtime/cache/stats
 * Get price cache statistics
 */
router.get('/cache/stats', getCacheStats);

/**
 * POST /api/v1/realtime/refresh
 * Force refresh all prices (manual trigger)
 */
router.post('/refresh', verifyCsrfToken, forceRefreshPrices);

/**
 * POST /api/v1/realtime/cache/clear
 * Clear price cache (admin/debug endpoint)
 * Body: { symbols?: string[] }
 */
router.post('/cache/clear', verifyCsrfToken, clearPriceCache);

export default router;
