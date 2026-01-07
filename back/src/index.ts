import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import config from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { helmetConfig, corsConfig, generalLimiter } from './middleware/security.js';
import router from './routes/index.js';
import v1Router from './routes/v1/index.js';
import { connectToDatabase } from './config/database.js';
import { initializeUserIndexes } from './models/User.js';
import { initializePortfolioSnapshotIndexes } from './models/PortfolioSnapshot.js';
import logger from './utils/logger.js';

const app: Express = express();

// Sécurité - Doit être appliqué en premier
app.use(helmetConfig);
app.use(corsConfig);

// Compression middleware - Après CORS, avant routes
app.use(compression({
    level: 6, // Balance compression/CPU
    threshold: 1024, // Seulement >1KB
    filter: (req: express.Request, res: express.Response) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Rate limiting général
app.use(generalLimiter);

// Cookie parser (MUST be before routes)
app.use(cookieParser());

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API v1 Routes (current)
app.use('/api/v1', v1Router);

// Legacy API Routes (deprecated - backwards compatibility)
app.use('/api', (req, res, next) => {
    // Add deprecation headers
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecation-Info', 'This API version is deprecated. Please use /api/v1/ instead.');
    res.setHeader('X-API-Sunset-Date', '2026-07-07'); // 6 months deprecation period
    next();
}, router);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', environment: config.nodeEnv });
});

// Error handling middleware (doit être le dernier)
app.use(errorHandler);

// Start server
async function startServer() {
    try {
        await connectToDatabase();
        logger.info('Database connected successfully');

        await initializeUserIndexes();
        logger.info('User indexes initialized');

        await initializePortfolioSnapshotIndexes();
        logger.info('Portfolio snapshot indexes initialized');

        app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

startServer();

export default app;
