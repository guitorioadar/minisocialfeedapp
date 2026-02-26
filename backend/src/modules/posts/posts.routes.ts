import { Router } from 'express';
import * as postsController from './posts.controller';
import { validate } from '../../middleware/validate';
import { createPostSchema } from './posts.schema';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createPostSchema), postsController.createPost);
router.get('/', postsController.getPosts);

export default router;
