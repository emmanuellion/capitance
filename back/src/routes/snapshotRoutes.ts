import { Router } from 'express';
import * as snapshotController from '../controllers/snapshotController.js';
import { verifyAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.get('/', verifyAuth, snapshotController.getSnapshots);
router.get('/timeline', verifyAuth, snapshotController.getTimeline);
router.get('/position/:isin', verifyAuth, snapshotController.getPosition);
router.post('/reprocess-all', verifyAuth, snapshotController.reprocessAllUploads);
router.get('/:snapshotId', verifyAuth, snapshotController.getSnapshot);
router.delete('/:snapshotId', verifyAuth, snapshotController.deleteSnapshot);

export default router;
