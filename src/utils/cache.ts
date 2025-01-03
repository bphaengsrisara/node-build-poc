import { redis } from '../index';
import { logger } from './logger';

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, expirySeconds?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (expirySeconds) {
        await redis.setex(key, expirySeconds, stringValue);
      } else {
        await redis.set(key, stringValue);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache pattern invalidation error:', error);
    }
  }
}
