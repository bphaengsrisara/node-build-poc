import { Express } from 'express';
import postRoutes from './posts';

export const setupRoutes = (app: Express) => {
  app.use('/api/posts', postRoutes);
};
