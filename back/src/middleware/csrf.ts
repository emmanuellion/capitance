import { type Request, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * CSRF Protection Middleware using Double Submit Cookie pattern
 *
 * How it works:
 * 1. Server generates a random CSRF token and sends it as a cookie
 * 2. Client includes this token in a custom header (X-CSRF-Token) for state-changing requests
 * 3. Server verifies that cookie value matches header value
 *
 * This protects against CSRF because an attacker cannot read the cookie value due to Same-Origin Policy
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 32 bytes = 256 bits

/**
 * HTTP methods that don't require CSRF protection (safe methods)
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a cryptographically secure random token
 */
function generateCsrfToken(): string {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and set CSRF token cookie
 * Should be applied early in the middleware chain
 */
export function setCsrfToken(req: Request, res: Response, next: NextFunction): void {
    // Check if CSRF cookie already exists
    const existingToken = req.cookies[CSRF_COOKIE_NAME];

    if (!existingToken) {
        // Generate new token
        const token = generateCsrfToken();

        // Set cookie with secure options
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: true, // Prevent XSS attacks
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict', // Prevent CSRF
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/',
        });

        logger.debug('CSRF token generated and set');
    }

    next();
}

/**
 * Middleware to verify CSRF token on state-changing requests
 * Should be applied to routes that modify data (POST, PUT, PATCH, DELETE)
 */
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF check for safe methods
    if (SAFE_METHODS.includes(req.method)) {
        return next();
    }

    // Get token from cookie
    const cookieToken = req.cookies[CSRF_COOKIE_NAME];

    // Get token from header
    const headerToken = req.get(CSRF_HEADER_NAME);

    // Both tokens must exist
    if (!cookieToken || !headerToken) {
        logger.warn('CSRF token missing', {
            method: req.method,
            path: req.path,
            hasCookie: !!cookieToken,
            hasHeader: !!headerToken,
        });

        return res.status(403).json({
            success: false,
            message: 'CSRF token missing. Please refresh the page.',
            code: 'CSRF_TOKEN_MISSING',
        });
    }

    // Tokens must match (constant-time comparison to prevent timing attacks)
    if (!constantTimeCompare(cookieToken, headerToken)) {
        logger.warn('CSRF token mismatch', {
            method: req.method,
            path: req.path,
        });

        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token. Please refresh the page.',
            code: 'CSRF_TOKEN_INVALID',
        });
    }

    // CSRF check passed
    next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Endpoint to get CSRF token for clients that need it explicitly
 * Useful for SPAs that need the token before making requests
 */
export function getCsrfToken(req: Request, res: Response): void {
    const token = req.cookies[CSRF_COOKIE_NAME];

    if (!token) {
        // Generate new token if it doesn't exist
        const newToken = generateCsrfToken();

        res.cookie(CSRF_COOKIE_NAME, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        });

        return res.status(200).json({
            success: true,
            token: newToken,
        });
    }

    res.status(200).json({
        success: true,
        token,
    });
}
