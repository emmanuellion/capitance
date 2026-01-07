import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export interface JwtPayload {
    userId: string;
    email: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

// Generate access token (short-lived)
export function generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiry,
        issuer: 'capitance',
        audience: 'capitance-api',
    });
}

// Generate refresh token (long-lived)
export function generateRefreshToken(payload: JwtPayload, rememberMe: boolean = false): string {
    const expiry = rememberMe ? config.jwt.refreshExpiryRemember : config.jwt.refreshExpiry;

    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: expiry,
        issuer: 'capitance',
        audience: 'capitance-api',
    });
}

// Generate token pair
export function generateTokenPair(payload: JwtPayload, rememberMe: boolean = false): TokenPair {
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload, rememberMe),
    };
}

// Verify access token
export function verifyAccessToken(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret, {
            issuer: 'capitance',
            audience: 'capitance-api',
        }) as JwtPayload;
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Access token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid access token');
        }
        throw error;
    }
}

// Verify refresh token
export function verifyRefreshToken(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret, {
            issuer: 'capitance',
            audience: 'capitance-api',
        }) as JwtPayload;
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
}

// Get token expiry time in milliseconds
export function getRefreshTokenExpiry(rememberMe: boolean = false): number {
    const expiry = rememberMe ? config.jwt.refreshExpiryRemember : config.jwt.refreshExpiry;

    // Parse duration string (e.g., '7d', '30d')
    const match = expiry.match(/^(\d+)([dhms])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
        case 's': return value * 1000;
        default: return 7 * 24 * 60 * 60 * 1000;
    }
}
