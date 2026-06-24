import { Router } from 'express';
import { resultController } from '../../infrastructure/container.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import { submitResultParamsSchema, submitResultSchema } from '../validators/result.validator.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  requireAuth,
  validate(submitResultParamsSchema, 'params'),
  validate(submitResultSchema),
  resultController.submitResult,
);

export default router;
