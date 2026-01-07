import { Router } from 'express';
import * as authController from '../../controllers/authController.js';
import { verifyAuth } from '../../middleware/auth.js';
import { verifyCsrfToken } from '../../middleware/csrf.js';
import {
    validateRegistration,
    validateLogin,
    validateForgotPassword,
    validateResetPassword,
} from '../../utils/validation.js';
import { strictLimiter } from '../../middleware/security.js';

const router = Router();

// Public routes (with strict rate limiting and CSRF protection)
router.post('/register', strictLimiter, verifyCsrfToken, validateRegistration, authController.register);
router.post('/login', strictLimiter, verifyCsrfToken, validateLogin, authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', strictLimiter, verifyCsrfToken, validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', strictLimiter, verifyCsrfToken, validateResetPassword, authController.resetPasswordHandler);
router.post('/refresh-token', verifyCsrfToken, authController.refreshAccessToken);

// Protected routes (require authentication and CSRF protection)
router.post('/logout', verifyAuth, verifyCsrfToken, authController.logout);
router.post('/logout-all', verifyAuth, verifyCsrfToken, authController.logoutAllDevices);
router.get('/me', verifyAuth, authController.getCurrentUser);

export default router;
