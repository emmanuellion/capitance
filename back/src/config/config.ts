import dotenv from 'dotenv';
import { validateEncryptionKey } from '../utils/encryption.js';

dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiry: string;
        refreshExpiry: string;
        refreshExpiryRemember: string;
    };
    cookie: {
        domain: string;
        secure: boolean;
        sameSite: 'strict' | 'lax' | 'none';
    };
    email: {
        service: string;
        from: string;
        fromName: string;
    };
    redis: {
        enabled: boolean;
        host: string;
        port: number;
        password?: string;
        db: number;
        keyPrefix: string;
        defaultTTL: number;
    };
    frontendUrl: string;
    password: {
        minLength: number;
    };
    twelveData: {
        apiKey: string;
        cacheTTL: number;
    };
    alphaVantage: {
        apiKey: string;
        cacheTTL: number;
    };
    binance: {
        encryptionKey: string;
        cacheTTL: number;
        snapshotTTL: number;
        dailySnapshotHour: number;
    };
}

const config: Config = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || '',
        refreshSecret: process.env.JWT_REFRESH_SECRET || '',
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        refreshExpiryRemember: process.env.JWT_REFRESH_EXPIRY_REMEMBER || '30d',
    },
    cookie: {
        domain: process.env.COOKIE_DOMAIN || 'localhost',
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'strict',
    },
    email: {
        service: process.env.EMAIL_SERVICE || 'console',
        from: process.env.EMAIL_FROM || 'noreply@capitance.com',
        fromName: process.env.EMAIL_FROM_NAME || 'Capitance',
    },
    redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: Number(process.env.REDIS_DB) || 0,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'capitance:',
        defaultTTL: Number(process.env.REDIS_DEFAULT_TTL) || 300, // 5 minutes
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    password: {
        minLength: Number(process.env.MIN_PASSWORD_LENGTH) || 8,
    },
    twelveData: {
        apiKey: process.env.TWELVE_DATA_API_KEY || '',
        cacheTTL: Number(process.env.TWELVE_DATA_CACHE_TTL) || 120, // 2 minutes
    },
    alphaVantage: {
        apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
        cacheTTL: Number(process.env.ALPHA_VANTAGE_CACHE_TTL) || 300, // 5 minutes
    },
    binance: {
        encryptionKey: process.env.BINANCE_ENCRYPTION_KEY || '',
        cacheTTL: Number(process.env.BINANCE_CACHE_TTL) || 300, // 5 minutes
        snapshotTTL: Number(process.env.BINANCE_SNAPSHOT_TTL) || 90 * 24 * 60 * 60 * 1000, // 90 days
        dailySnapshotHour: Number(process.env.BINANCE_DAILY_SNAPSHOT_HOUR) || 0, // 00:00 UTC
    },
};

// Validate critical config on startup
if (!config.jwt.accessSecret || config.jwt.accessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
}
if (!config.jwt.refreshSecret || config.jwt.refreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
}
if (!config.twelveData.apiKey) {
    console.warn('WARNING: TWELVE_DATA_API_KEY is not set. Real-time price updates will not work.');
}

// Validate Binance encryption key if configured
if (config.binance.encryptionKey) {
    try {
        validateEncryptionKey(config.binance.encryptionKey);
    } catch (error) {
        console.error('BINANCE_ENCRYPTION_KEY validation failed:', error instanceof Error ? error.message : error);
        throw error;
    }
} else {
    console.warn('WARNING: BINANCE_ENCRYPTION_KEY is not set. Binance API key storage will not work.');
}

export default config;