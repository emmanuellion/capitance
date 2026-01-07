import { Router } from 'express';
import authRoutes from './authRoutes.js';
import fileRoutes from './fileRoutes.js';
import snapshotRoutes from './snapshotRoutes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/snapshots', snapshotRoutes);

export default router;
