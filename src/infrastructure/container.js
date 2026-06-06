import { UserRepository } from './repositories/UserRepository.js';
import { WcaProfileRepository } from './repositories/WcaProfileRepository.js';
import { AuthService } from '../application/services/AuthService.js';
import { WcaService } from '../application/services/WcaService.js';
import { AuthController } from '../presentation/controllers/AuthController.js';
import { models } from './database/models/index.js';

const userRepository = new UserRepository(models);
const wcaProfileRepository = new WcaProfileRepository(models);
const wcaService = new WcaService(wcaProfileRepository);
const authService = new AuthService(userRepository);
const authController = new AuthController(authService, wcaService);

export { userRepository, wcaProfileRepository, wcaService, authService, authController };
