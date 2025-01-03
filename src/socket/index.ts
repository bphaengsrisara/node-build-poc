import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { logger } from '../utils/logger';

export const setupSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    logger.info(`User connected: ${userId}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle post notifications
    socket.on('subscribe:posts', (postId: string) => {
      socket.join(`post:${postId}`);
      logger.info(`User ${userId} subscribed to post ${postId}`);
    });

    socket.on('unsubscribe:posts', (postId: string) => {
      socket.leave(`post:${postId}`);
      logger.info(`User ${userId} unsubscribed from post ${postId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
    });
  });

  return {
    notifyNewComment: (postId: string, comment: any) => {
      io.to(`post:${postId}`).emit('new:comment', comment);
    },
    
    notifyPostUpdate: (postId: string, post: any) => {
      io.to(`post:${postId}`).emit('update:post', post);
    },

    notifyUser: (userId: string, notification: any) => {
      io.to(`user:${userId}`).emit('notification', notification);
    }
  };
};
