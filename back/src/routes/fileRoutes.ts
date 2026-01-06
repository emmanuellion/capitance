import { Router } from 'express';
import * as fileController from '../controllers/fileController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/getFile/:id', fileController.getFile);
router.post('/addFile/:id', upload.single('file'), fileController.addFile);
router.delete('/removeFile/:id/:filename', fileController.removeFile);

export default router;
