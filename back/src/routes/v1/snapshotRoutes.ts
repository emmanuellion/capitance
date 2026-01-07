import { Router } from 'express';
import * as snapshotController from '../../controllers/snapshotController.js';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyCsrfToken } from '../../middleware/csrf.js';

const router = Router();

// All routes require authentication, state-changing routes also require CSRF
router.get('/', verifyAuth, snapshotController.getSnapshots);
router.get('/timeline', verifyAuth, snapshotController.getTimeline);
router.get('/position/:isin', verifyAuth, snapshotController.getPosition);
router.post('/reprocess-all', verifyAuth, verifyCsrfToken, snapshotController.reprocessAllUploads);
router.get('/:snapshotId', verifyAuth, snapshotController.getSnapshot);
router.delete('/:snapshotId', verifyAuth, verifyCsrfToken, snapshotController.deleteSnapshot);

export default router;
