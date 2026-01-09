import { Router } from 'express';
import authRoutes from './authRoutes.js';
import fileRoutes from './fileRoutes.js';
import snapshotRoutes from './snapshotRoutes.js';
import realtimePriceRoutes from './realtimePriceRoutes.js';
import binanceRoutes from './binanceRoutes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/snapshots', snapshotRoutes);
router.use('/realtime', realtimePriceRoutes);
router.use('/binance', binanceRoutes);

export default router;
