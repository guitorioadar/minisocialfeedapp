import { Router } from 'express';
import * as notificationsController from './notifications.controller';
import { validate } from '../../middleware/validate';
import { registerTokenSchema } from './notifications.schema';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/register-token', validate(registerTokenSchema), notificationsController.registerToken);

export default router;
