import { body, validationResult } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import { type Request, type Response, type NextFunction } from 'express';
import config from '../config/config.js';

// Validation error handler middleware
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg,
            })),
        });
        return;
    }

    next();
}

// Email validation
export const validateEmail = (): ValidationChain =>
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email too long');

// Password validation
export const validatePassword = (fieldName: string = 'password'): ValidationChain =>
    body(fieldName)
        .notEmpty().withMessage('Password is required')
        .isLength({ min: config.password.minLength })
        .withMessage(`Password must be at least ${config.password.minLength} characters`)
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@\-#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character');

// Binance API keys validation
export const validateBinanceApiKeys = [
    body('apiKey')
        .trim()
        .notEmpty().withMessage('API key is required')
        .isLength({ min: 20, max: 200 }).withMessage('Invalid API key format'),
    body('apiSecret')
        .trim()
        .notEmpty().withMessage('API secret is required')
        .isLength({ min: 50, max: 200 }).withMessage('Invalid API secret format'),
    handleValidationErrors,
];

// Registration validation
export const validateRegistration = [
    validateEmail(),
    validatePassword(),
    body('confirmPassword')
        .notEmpty().withMessage('Password confirmation is required')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    handleValidationErrors,
];

// Login validation
export const validateLogin = [
    validateEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    body('rememberMe').optional().isBoolean().withMessage('Remember me must be boolean'),
    handleValidationErrors,
];

// Forgot password validation
export const validateForgotPassword = [
    validateEmail(),
    handleValidationErrors,
];

// Reset password validation
export const validateResetPassword = [
    body('token')
        .notEmpty().withMessage('Reset token is required')
        .isLength({ min: 64, max: 64 }).withMessage('Invalid reset token format'),
    validatePassword('newPassword'),
    body('confirmPassword')
        .notEmpty().withMessage('Password confirmation is required')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match'),
    handleValidationErrors,
];
