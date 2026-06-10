import { Router } from 'express';
import { videoController } from '../../infrastructure/container.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { videoTokenSchema } from '../validators/video.validator.js';

const router = Router();

router.post('/token', requireAuth, validate(videoTokenSchema), videoController.createToken);

export default router;
