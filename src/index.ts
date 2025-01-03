import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { errorHandler } from './middlewares/errorHandler';
import { setupRoutes } from './routes';
import { rateLimiter } from './middlewares/rateLimiter';
import { setupSocketHandlers } from './socket';
import { logger } from './utils/logger';

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Initialize Redis Client
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(rateLimiter);

// Setup routes
setupRoutes(app);

// Setup WebSocket handlers
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);

// Connect to databases and start server
async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');

    // Test Redis connection
    await redis.ping();
    logger.info('Connected to Redis');

    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  
  await Promise.all([
    prisma.$disconnect(),
    redis.quit(),
    new Promise((resolve) => httpServer.close(resolve))
  ]);
  
  process.exit(0);
});

bootstrap().catch((error) => {
  logger.error('Bootstrap error:', error);
  process.exit(1);
});
