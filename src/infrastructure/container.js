import { UserRepository } from './repositories/UserRepository.js';
import { WcaProfileRepository } from './repositories/WcaProfileRepository.js';
import { RankingRepository } from './repositories/RankingRepository.js';
import { AuthService } from '../application/services/AuthService.js';
import { WcaService } from '../application/services/WcaService.js';
import { RankingService } from '../application/services/RankingService.js';
import { AuthController } from '../presentation/controllers/AuthController.js';
import { RankingController } from '../presentation/controllers/RankingController.js';
import { models } from './database/models/index.js';
import { cacheService } from './cache/CacheService.js';

const userRepository = new UserRepository(models);
const wcaProfileRepository = new WcaProfileRepository(models);
const rankingRepository = new RankingRepository(models);

const wcaService = new WcaService(wcaProfileRepository);
const authService = new AuthService(userRepository, rankingRepository);
const rankingService = new RankingService(rankingRepository, cacheService);

const authController = new AuthController(authService, wcaService);
const rankingController = new RankingController(rankingService);

export {
  userRepository,
  wcaProfileRepository,
  rankingRepository,
  wcaService,
  authService,
  rankingService,
  authController,
  rankingController,
  cacheService,
};
