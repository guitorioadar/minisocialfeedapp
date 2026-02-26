import { Router } from 'express';
import * as likesController from './likes.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/:id/like', likesController.toggleLike);

export default router;
