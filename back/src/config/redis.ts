import Redis from 'ioredis';
import logger from '../utils/logger.js';
import config from './config.js';

// Redis configuration with retry strategy
const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  keyPrefix: config.redis.keyPrefix,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error('Redis connection failed after 10 retries');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    logger.debug(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true, // Don't connect immediately, connect on first command
};

// Create Redis client if enabled
let redisClient: Redis | null = null;

if (config.redis.enabled) {
  logger.info('Initializing Redis client', {
    host: config.redis.host,
    port: config.redis.port,
    db: config.redis.db,
  });

  redisClient = new Redis(redisOptions);

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redisClient.on('ready', () => {
    logger.info('Redis ready to accept commands');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', (delay: number) => {
    logger.info('Redis reconnecting...', { delay });
  });

  redisClient.on('end', () => {
    logger.warn('Redis connection ended');
  });

  // Attempt to connect
  redisClient.connect().catch((err) => {
    logger.error('Failed to connect to Redis', { error: err.message });
  });
} else {
  logger.info('Redis is disabled. Caching will be skipped.');
}

/**
 * Gracefully close Redis connection on process termination
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient && redisClient.status !== 'end') {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

export default redisClient;
