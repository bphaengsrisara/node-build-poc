import rateLimit from 'express-rate-limit';
import { redis } from '../index';
import { logger } from '../utils/logger';

const RedisStore = require('rate-limit-redis');

export const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: async (command: string, ...args: string[]) => redis.call(command, ...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for IP:', req.ip);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});
