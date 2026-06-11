import { UserRepository } from './repositories/UserRepository.js';
import { WcaProfileRepository } from './repositories/WcaProfileRepository.js';
import { RankingRepository } from './repositories/RankingRepository.js';
import { CompetitionRepository } from './repositories/CompetitionRepository.js';
import { AuthService } from '../application/services/AuthService.js';
import { WcaService } from '../application/services/WcaService.js';
import { RankingService } from '../application/services/RankingService.js';
import { VideoService } from '../application/services/VideoService.js';
import { CompetitionService } from '../application/services/CompetitionService.js';
import { AuthController } from '../presentation/controllers/AuthController.js';
import { RankingController } from '../presentation/controllers/RankingController.js';
import { VideoController } from '../presentation/controllers/VideoController.js';
import { CompetitionController } from '../presentation/controllers/CompetitionController.js';
import { models } from './database/models/index.js';
import { cacheService } from './cache/CacheService.js';

const userRepository = new UserRepository(models);
const wcaProfileRepository = new WcaProfileRepository(models);
const rankingRepository = new RankingRepository(models);
const competitionRepository = new CompetitionRepository(models);

const wcaService = new WcaService(wcaProfileRepository);
const authService = new AuthService(userRepository, rankingRepository);
const rankingService = new RankingService(rankingRepository, cacheService);
const videoService = new VideoService();
const competitionService = new CompetitionService(competitionRepository);

const authController = new AuthController(authService, wcaService);
const rankingController = new RankingController(rankingService);
const videoController = new VideoController(videoService);
const competitionController = new CompetitionController(competitionService);

export {
  userRepository,
  wcaProfileRepository,
  rankingRepository,
  competitionRepository,
  wcaService,
  authService,
  rankingService,
  videoService,
  competitionService,
  authController,
  rankingController,
  videoController,
  competitionController,
  cacheService,
};
