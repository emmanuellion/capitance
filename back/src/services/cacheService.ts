import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';
import config from '../config/config.js';

class CacheService {
  private redis = redisClient;
  private readonly defaultTTL = config.redis.defaultTTL;

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
   * Set a value in cache with TTL (in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redis?.isReady) {
      logger.debug('Redis not available, skipping cache set', { key });
      return;
    }

    const ttlToUse = ttl ?? this.defaultTTL;

    try {
      await this.redis.setex(key, ttlToUse, JSON.stringify(value));
      logger.debug('Cache set', { key, ttl: ttlToUse });
    } catch (error) {
      logger.error('Cache set error', { key, ttl: ttlToUse, error });
    }
  }

  /**
   * Get or set a value in cache with a factory function
   * If the key exists, return the cached value
   * Otherwise, call the factory function, cache the result, and return it
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      logger.debug('Cache hit', { key });
      return cached;
    }

    // Cache miss, call factory
    logger.debug('Cache miss', { key });
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Delete a specific key
   */
  async deleteKey(key: string): Promise<void> {
    if (!this.redis?.isReady) {
      logger.debug('Redis not available, skipping cache delete', { key });
      return;
    }

    try {
      await this.redis.del(key);
      logger.debug('Cache key deleted', { key });
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Delete keys matching a pattern
   * Note: KEYS command is not recommended for production with large datasets
   * Consider using SCAN for production environments with many keys
   */
  async delete(pattern: string): Promise<void> {
    if (!this.redis?.isReady) {
      logger.debug('Redis not available, skipping cache delete', { pattern });
      return;
    }

    try {
      // Remove the keyPrefix from pattern since it's added automatically
      const strippedPattern = pattern.replace(config.redis.keyPrefix, '');
      const keys = await this.redis.keys(strippedPattern);

      if (keys.length > 0) {
        // Keys already have prefix, remove it before deletion
        const keysWithoutPrefix = keys.map(k => k.replace(config.redis.keyPrefix, ''));
        await this.redis.del(...keysWithoutPrefix);
        logger.info('Cache keys deleted', { pattern, count: keys.length });
      } else {
        logger.debug('No keys found matching pattern', { pattern });
      }
    } catch (error) {
      logger.error('Cache delete error', { pattern, error });
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.redis?.isReady) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error });
      return false;
    }
  }

  /**
   * Get time to live for a key (in seconds)
   * Returns -1 if key exists but has no expiry
   * Returns -2 if key does not exist
   */
  async ttl(key: string): Promise<number> {
    if (!this.redis?.isReady) {
      return -2;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error', { key, error });
      return -2;
    }
  }

  /**
   * Extend TTL for an existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.redis?.isReady) {
      return false;
    }

    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', { key, ttl, error });
      return false;
    }
  }

  /**
   * Clear all cache in current database
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
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsed?: string;
  }> {
    if (!this.redis?.isReady) {
      return {
        connected: false,
        keyCount: 0,
      };
    }

    try {
      const dbSize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);

      return {
        connected: true,
        keyCount: dbSize,
        memoryUsed: memoryMatch ? memoryMatch[1] : undefined,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return {
        connected: false,
        keyCount: 0,
      };
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
