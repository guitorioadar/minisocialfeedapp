import { Router } from 'express';
import * as commentsController from './comments.controller';
import { validate } from '../../middleware/validate';
import { createCommentSchema } from './comments.schema';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/:id/comment', validate(createCommentSchema), commentsController.createComment);
router.get('/:id/comments', commentsController.getComments);

export default router;
