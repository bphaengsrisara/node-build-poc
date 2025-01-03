import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { Cache } from '../utils/cache';
import { AppError } from '../middlewares/errorHandler';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

export class PostController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { title, content, published, tags } = createPostSchema.parse(req.body);

      const post = await prisma.post.create({
        data: {
          title,
          content,
          published: published ?? false,
          author: { connect: { id: req.user!.id } },
          tags: tags ? {
            connectOrCreate: tags.map(tag => ({
              where: { name: tag },
              create: { name: tag }
            }))
          } : undefined
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          tags: true
        }
      });

      // Invalidate cache
      await Cache.invalidatePattern('posts:*');

      return res.status(201).json({
        status: 'success',
        data: post
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const cacheKey = `posts:page:${page}:limit:${limit}`;

      // Try to get from cache
      const cached = await Cache.get(cacheKey);
      if (cached) {
        return res.json({
          status: 'success',
          data: cached,
          source: 'cache'
        });
      }

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          skip: (page - 1) * limit,
          take: limit,
          include: {
            author: {
              select: { id: true, name: true, email: true }
            },
            tags: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.post.count()
      ]);

      const result = {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      // Cache for 5 minutes
      await Cache.set(cacheKey, result, 300);

      return res.json({
        status: 'success',
        data: result,
        source: 'database'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const cacheKey = `posts:${id}`;

      // Try to get from cache
      const cached = await Cache.get(cacheKey);
      if (cached) {
        return res.json({
          status: 'success',
          data: cached,
          source: 'cache'
        });
      }

      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          tags: true,
          comments: {
            include: {
              author: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      if (!post) {
        throw new AppError(404, 'Post not found');
      }

      // Cache for 5 minutes
      await Cache.set(cacheKey, post, 300);

      return res.json({
        status: 'success',
        data: post,
        source: 'database'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { title, content, published, tags } = createPostSchema.parse(req.body);

      const post = await prisma.post.findUnique({
        where: { id },
        select: { authorId: true }
      });

      if (!post) {
        throw new AppError(404, 'Post not found');
      }

      if (post.authorId !== req.user!.id) {
        throw new AppError(403, 'Not authorized to update this post');
      }

      const updated = await prisma.post.update({
        where: { id },
        data: {
          title,
          content,
          published,
          tags: tags ? {
            set: [],
            connectOrCreate: tags.map(tag => ({
              where: { name: tag },
              create: { name: tag }
            }))
          } : undefined
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          tags: true
        }
      });

      // Invalidate cache
      await Promise.all([
        Cache.del(`posts:${id}`),
        Cache.invalidatePattern('posts:page:*')
      ]);

      return res.json({
        status: 'success',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;

      const post = await prisma.post.findUnique({
        where: { id },
        select: { authorId: true }
      });

      if (!post) {
        throw new AppError(404, 'Post not found');
      }

      if (post.authorId !== req.user!.id) {
        throw new AppError(403, 'Not authorized to delete this post');
      }

      await prisma.post.delete({ where: { id } });

      // Invalidate cache
      await Promise.all([
        Cache.del(`posts:${id}`),
        Cache.invalidatePattern('posts:page:*')
      ]);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
