import { Router } from 'express';
import { PostController } from '../controllers/postController';
import { auth } from '../middlewares/auth';

const router = Router();

router
  .route('/')
  .get(PostController.getAll)
  .post(auth, PostController.create);

router
  .route('/:id')
  .get(PostController.getOne)
  .put(auth, PostController.update)
  .delete(auth, PostController.delete);

export default router;
