import { Router } from 'express';
import * as fileController from '../../controllers/fileController.js';
import { upload } from '../../middleware/upload.js';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyCsrfToken } from '../../middleware/csrf.js';

const router = Router();

// Protect all file routes with authentication and CSRF
router.get('/getFile/:id', verifyAuth, fileController.getFile);
router.post('/addFile', verifyAuth, verifyCsrfToken, upload.single('file'), fileController.addFile);
router.delete('/removeFile', verifyAuth, verifyCsrfToken, fileController.removeFile);

export default router;
