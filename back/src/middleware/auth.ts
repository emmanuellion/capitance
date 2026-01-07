import { type Request, type Response, type NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import type { JwtPayload } from '../utils/jwt.js';
import { findUserById } from '../models/User.js';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                isVerified: boolean;
            };
        }
    }
}

// Verify access token from httpOnly cookie
export async function verifyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Get access token from cookie
        const accessToken = req.cookies?.accessToken;

        if (!accessToken) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'NO_TOKEN',
            });
            return;
        }

        // Verify token
        let payload: JwtPayload;
        try {
            payload = verifyAccessToken(accessToken);
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error instanceof Error ? error.message : 'Invalid token',
                code: 'INVALID_TOKEN',
            });
            return;
        }

        // Get user from database
        const user = await findUserById(payload.userId);

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
            });
            return;
        }

        // Attach user to request
        req.user = {
            userId: user._id!.toString(),
            email: user.email,
            isVerified: user.isVerified,
        };

        next();
    } catch (error) {
        next(error);
    }
}

// Verify user has verified email
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
        return;
    }

    if (!req.user.isVerified) {
        res.status(403).json({
            success: false,
            message: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED',
        });
        return;
    }

    next();
}

// Optional auth (doesn't fail if no token, just doesn't attach user)
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const accessToken = req.cookies?.accessToken;

        if (!accessToken) {
            next();
            return;
        }

        try {
            const payload = verifyAccessToken(accessToken);
            const user = await findUserById(payload.userId);

            if (user) {
                req.user = {
                    userId: user._id!.toString(),
                    email: user.email,
                    isVerified: user.isVerified,
                };
            }
        } catch (error) {
            // Silently fail for optional auth
        }

        next();
    } catch (error) {
        next(error);
    }
}
