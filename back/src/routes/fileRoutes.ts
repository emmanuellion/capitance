import { Router } from 'express';
import * as fileController from '../controllers/fileController.js';
import { upload } from '../middleware/upload.js';
import {strictLimiter} from "../middleware/security.js";

const router = Router();

router.get('/getFile/:id', strictLimiter, fileController.getFile);
router.post('/addFile', strictLimiter, upload.single('file'), fileController.addFile);
router.delete('/removeFile', strictLimiter, fileController.removeFile);

export default router;
