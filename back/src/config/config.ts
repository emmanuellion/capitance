import dotenv from 'dotenv';

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
    frontendUrl: string;
    password: {
        minLength: number;
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
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    password: {
        minLength: Number(process.env.MIN_PASSWORD_LENGTH) || 8,
    },
};

// Validate critical config on startup
if (!config.jwt.accessSecret || config.jwt.accessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');
}
if (!config.jwt.refreshSecret || config.jwt.refreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
}

export default config;