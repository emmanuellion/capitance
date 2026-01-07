import { type Request, type Response, type NextFunction } from 'express';
import {
    createUser,
    findUserByEmail,
    findUserById,
    verifyUserEmail,
    setResetPasswordToken,
    resetPassword,
    addRefreshToken,
    removeRefreshToken,
    hasValidRefreshToken,
    clearAllRefreshTokens,
    comparePassword,
    toUserResponse,
} from '../models/User.js';
import {
    generateTokenPair,
    verifyRefreshToken,
    getRefreshTokenExpiry,
} from '../utils/jwt.js';
import {
    sendVerificationEmail,
    sendPasswordResetEmail,
} from '../services/emailService.js';
import config from '../config/config.js';

// Cookie options for httpOnly cookies
function getAccessTokenCookieOptions() {
    return {
        httpOnly: true,
        secure: config.cookie.secure, // true in production (HTTPS only)
        sameSite: config.cookie.sameSite as 'strict' | 'lax' | 'none',
        maxAge: 15 * 60 * 1000, // 15 minutes (match JWT expiry)
        domain: config.cookie.domain,
        path: '/',
    };
}

function getRefreshTokenCookieOptions(rememberMe: boolean = false) {
    return {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite as 'strict' | 'lax' | 'none',
        maxAge: getRefreshTokenExpiry(rememberMe),
        domain: config.cookie.domain,
        path: '/',
    };
}

// Register new user
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'Email already registered',
            });
            return;
        }

        // Create user
        const { userId, verificationToken } = await createUser({ email, password });

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            data: {
                userId: userId.toString(),
                email,
            },
        });
    } catch (error) {
        next(error);
    }
}

// Login user
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password, rememberMe = false } = req.body;

        // Find user
        const user = await findUserByEmail(email);
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
            return;
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
            return;
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(
            { userId: user._id!.toString(), email: user.email },
            rememberMe
        );

        // Store refresh token in database
        await addRefreshToken(user._id!.toString(), refreshToken);

        // Set httpOnly cookies
        res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
        res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions(rememberMe));

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: toUserResponse(user),
            },
        });
    } catch (error) {
        next(error);
    }
}

// Verify email
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token } = req.params;

        const success = await verifyUserEmail(token);

        if (!success) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        next(error);
    }
}

// Forgot password
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email } = req.body;

        // Find user
        const user = await findUserByEmail(email);

        // Always return success to prevent email enumeration
        if (!user) {
            res.status(200).json({
                success: true,
                message: 'If the email exists, a password reset link has been sent',
            });
            return;
        }

        // Generate reset token
        const resetToken = await setResetPasswordToken(email);

        if (resetToken) {
            // Send reset email
            await sendPasswordResetEmail(email, resetToken);
        }

        res.status(200).json({
            success: true,
            message: 'If the email exists, a password reset link has been sent',
        });
    } catch (error) {
        next(error);
    }
}

// Reset password
export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token, newPassword } = req.body;

        const success = await resetPassword(token, newPassword);

        if (!success) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token',
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Password reset successful. Please login with your new password.',
        });
    } catch (error) {
        next(error);
    }
}

// Refresh access token
export async function refreshAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            res.status(401).json({
                success: false,
                message: 'Refresh token required',
            });
            return;
        }

        // Verify refresh token
        let payload;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error instanceof Error ? error.message : 'Invalid refresh token',
            });
            return;
        }

        // Check if refresh token exists in database
        const isValid = await hasValidRefreshToken(payload.userId, refreshToken);
        if (!isValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
            });
            return;
        }

        // Get user
        const user = await findUserById(payload.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        // Generate new tokens
        const tokens = generateTokenPair(
            { userId: user._id!.toString(), email: user.email },
            false // Don't extend expiry on refresh
        );

        // Remove old refresh token and add new one
        await removeRefreshToken(user._id!.toString(), refreshToken);
        await addRefreshToken(user._id!.toString(), tokens.refreshToken);

        // Set new cookies
        res.cookie('accessToken', tokens.accessToken, getAccessTokenCookieOptions());
        res.cookie('refreshToken', tokens.refreshToken, getRefreshTokenCookieOptions(false));

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
        });
    } catch (error) {
        next(error);
    }
}

// Logout
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken && req.user) {
            // Remove refresh token from database
            await removeRefreshToken(req.user.userId, refreshToken);
        }

        // Clear cookies
        res.clearCookie('accessToken', { path: '/', domain: config.cookie.domain });
        res.clearCookie('refreshToken', { path: '/', domain: config.cookie.domain });

        res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    } catch (error) {
        next(error);
    }
}

// Get current user
export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
            return;
        }

        const user = await findUserById(req.user.userId);

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                user: toUserResponse(user),
            },
        });
    } catch (error) {
        next(error);
    }
}

// Logout from all devices
export async function logoutAllDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
            return;
        }

        // Clear all refresh tokens
        await clearAllRefreshTokens(req.user.userId);

        // Clear cookies
        res.clearCookie('accessToken', { path: '/', domain: config.cookie.domain });
        res.clearCookie('refreshToken', { path: '/', domain: config.cookie.domain });

        res.status(200).json({
            success: true,
            message: 'Logged out from all devices',
        });
    } catch (error) {
        next(error);
    }
}
