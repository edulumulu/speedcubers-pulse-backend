import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthService } from '../../application/services/AuthService.js';
import { WcaService } from '../../application/services/WcaService.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { WcaProfileRepository } from '../../infrastructure/repositories/WcaProfileRepository.js';
import { models } from '../../infrastructure/database/models/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshSchema,
  linkWcaSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

const authService = new AuthService(new UserRepository(models));
const wcaService = new WcaService(new WcaProfileRepository(models));
const controller = new AuthController(authService, wcaService);

router.get('/check', controller.checkAvailability);
router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', requireAuth, controller.logout);
router.post('/link-wca', requireAuth, validate(linkWcaSchema), controller.linkWca);
router.delete('/link-wca', requireAuth, controller.unlinkWca);
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

export default router;
