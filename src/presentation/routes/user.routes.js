import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { UserService } from '../../application/services/UserService.js';
import { WcaService } from '../../application/services/WcaService.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { WcaProfileRepository } from '../../infrastructure/repositories/WcaProfileRepository.js';
import { models } from '../../infrastructure/database/models/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate, updateMeSchema } from '../validators/user.validator.js';

const router = Router();

const userService = new UserService(
  new UserRepository(models),
  new WcaService(new WcaProfileRepository(models)),
);
const controller = new UserController(userService);

router.get('/me', requireAuth, controller.getMe);
router.patch('/me', requireAuth, validate(updateMeSchema), controller.updateMe);
router.delete('/me', requireAuth, controller.deleteMe);
router.get('/:username', controller.getByUsername);

export default router;
