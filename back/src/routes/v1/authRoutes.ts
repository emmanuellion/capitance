import { Router } from 'express';
import * as authController from '../../controllers/authController.js';
import { verifyAuth } from '../../middleware/auth.js';
import {
    validateRegistration,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
} from '../../utils/validation.js';
import { strictLimiter } from '../../middleware/security.js';

const router = Router();

// Public routes (with strict rate limiting)
router.post('/register', strictLimiter, validateRegistration, authController.register);
router.post('/login', strictLimiter, validateLogin, authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', strictLimiter, validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', strictLimiter, validateResetPassword, authController.resetPasswordHandler);
router.post('/refresh-token', authController.refreshAccessToken);

// Protected routes (require authentication)
router.post('/logout', verifyAuth, authController.logout);
router.post('/logout-all', verifyAuth, authController.logoutAllDevices);
router.get('/me', verifyAuth, authController.getCurrentUser);

export default router;
