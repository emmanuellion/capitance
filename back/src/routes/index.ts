import { Router } from 'express';
import fileRoutes from "./fileRoutes.js";

const router = Router();

router.use('/file', fileRoutes);

export default router;
