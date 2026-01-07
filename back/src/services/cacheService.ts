import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

class CacheService {
  private redis = redisClient;

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis?.isReady) {
      logger.debug('Redis not available, skipping cache get', { key });
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!this.redis?.isReady) {
      logger.debug('Redis not available, skipping cache set', { key });
      return;
    }

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, ttl, error });
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async delete(pattern: string): Promise<void> {
    if (!this.redis?.isReady) {
      logger.debug('Redis not available, skipping cache delete', { pattern });
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Cache keys deleted', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Cache delete error', { pattern, error });
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.redis?.isReady) {
      logger.debug('Redis not available, skipping cache clear');
      return;
    }

    try {
      await this.redis.flushdb();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error', { error });
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redis?.isReady ?? false;
  }
}

export const cacheService = new CacheService();
