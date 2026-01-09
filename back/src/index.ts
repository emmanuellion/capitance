import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { helmetConfig, corsConfig, generalLimiter } from './middleware/security.js';
import { setCsrfToken, getCsrfToken } from './middleware/csrf.js';
import router from './routes/index.js';
import v1Router from './routes/v1/index.js';
import { connectToDatabase, closeDatabaseConnection } from './config/database.js';
import { initializeUserIndexes } from './models/User.js';
import { initializePortfolioSnapshotIndexes } from './models/PortfolioSnapshot.js';
import { closeRedis } from './config/redis.js';
import logger from './utils/logger.js';
import priceUpdateWorker from './services/priceUpdateWorker.js';
import binanceSnapshotScheduler from './services/binanceSnapshotScheduler.js';

// ES Module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// CSRF Protection - Set token cookie on all requests
app.use(setCsrfToken);

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// Swagger API Documentation
if (config.nodeEnv === 'development') {
    try {
        const swaggerDocument = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'Capitance API Documentation',
        }));
        logger.info('Swagger UI available at /api-docs');
    } catch (error) {
        logger.error('Failed to load Swagger documentation', { error });
    }
}

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

        // Initialize symbol mapping indexes
        const { initializeSymbolMappingIndexes } = await import('./models/SymbolMapping.js');
        await initializeSymbolMappingIndexes();
        logger.info('Symbol mapping indexes initialized');

        // Initialize Binance snapshot indexes
        const { initializeBinanceSnapshotIndexes } = await import('./models/BinanceSnapshot.js');
        await initializeBinanceSnapshotIndexes();
        logger.info('Binance snapshot indexes initialized');

        // Start price update worker if Twelve Data API key is configured
        if (config.twelveData.apiKey) {
            priceUpdateWorker.start();
            logger.info('Price update worker started');
        } else {
            logger.warn('Price update worker not started - TWELVE_DATA_API_KEY not configured');
        }

        // Start Binance snapshot scheduler if encryption key is configured
        if (config.binance.encryptionKey) {
            binanceSnapshotScheduler.start();
            logger.info('Binance snapshot scheduler started');
        } else {
            logger.warn('Binance snapshot scheduler not started - BINANCE_ENCRYPTION_KEY not configured');
        }

        app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    try {
        // Stop price update worker
        priceUpdateWorker.stop();
        logger.info('Price update worker stopped');

        // Stop Binance snapshot scheduler
        binanceSnapshotScheduler.stop();
        logger.info('Binance snapshot scheduler stopped');

        // Close Redis connection
        await closeRedis();

        // Close database connection
        await closeDatabaseConnection();

        logger.info('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown', { error });
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
