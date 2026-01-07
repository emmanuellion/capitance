import { Router } from 'express';
import * as fileController from '../../controllers/fileController.js';
import { upload } from '../../middleware/upload.js';
import { verifyAuth } from '../../middleware/auth.js';

const router = Router();

// Protect all file routes with authentication
router.get('/getFile/:id', verifyAuth, fileController.getFile);
router.post('/addFile', verifyAuth, upload.single('file'), fileController.addFile);
router.delete('/removeFile', verifyAuth, fileController.removeFile);

export default router;
