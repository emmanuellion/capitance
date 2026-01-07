import { Router } from 'express';
import fileRoutes from "./fileRoutes.js";
import authRoutes from './authRoutes.js';
import snapshotRoutes from './snapshotRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/snapshots', snapshotRoutes);

export default router;
