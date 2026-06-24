import { Router } from 'express';
import { authController as controller } from '../../infrastructure/container.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshSchema,
  linkWcaSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkAvailabilitySchema,
} from '../validators/auth.validator.js';

const router = Router();

router.get('/check', validate(checkAvailabilitySchema, 'query'), controller.checkAvailability);
router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', requireAuth, controller.logout);
router.post('/link-wca', requireAuth, validate(linkWcaSchema), controller.linkWca);
router.delete('/link-wca', requireAuth, controller.unlinkWca);
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

export default router;
