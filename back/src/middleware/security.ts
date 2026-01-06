import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    frameguard: {
        action: 'deny',
    },
    hidePoweredBy: true,
});

// Configuration CORS
export const corsConfig = cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

// Rate Limiter général - Limite les requêtes globales
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Max 100 requêtes par fenêtre par IP
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiter strict pour les routes sensibles (auth, etc.)
export const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Max 5 requêtes par fenêtre
    message: 'Trop de tentatives, veuillez réessayer plus tard',
    standardHeaders: true,
    legacyHeaders: false,
});
