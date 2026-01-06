import express, { type Express } from 'express';
import config from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { helmetConfig, corsConfig, generalLimiter } from './middleware/security.js';
import router from './routes/index.js';

const app: Express = express();

// Sécurité - Doit être appliqué en premier
app.use(helmetConfig);
app.use(corsConfig);

// Rate limiting général
app.use(generalLimiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', router);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', environment: config.nodeEnv });
});

// Error handling middleware (doit être le dernier)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

export default app;
