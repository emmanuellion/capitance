import Redis from 'ioredis';
import logger from '../utils/logger.js';
import config from './config.js';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

// Create Redis client if enabled
let redisClient: Redis | null = null;

if (process.env.REDIS_ENABLED === 'true') {
  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redisClient.on('ready', () => {
    logger.info('Redis ready to accept commands');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err });
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });
}

export default redisClient;
