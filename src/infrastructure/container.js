import { UserRepository } from './repositories/UserRepository.js';
import { WcaProfileRepository } from './repositories/WcaProfileRepository.js';
import { RankingRepository } from './repositories/RankingRepository.js';
import { CompetitionRepository } from './repositories/CompetitionRepository.js';
import { CompetitionRoundRepository } from './repositories/CompetitionRoundRepository.js';
import { ResultRepository } from './repositories/ResultRepository.js';
import { AuthService } from '../application/services/AuthService.js';
import { WcaService } from '../application/services/WcaService.js';
import { RankingService } from '../application/services/RankingService.js';
import { VideoService } from '../application/services/VideoService.js';
import { CompetitionService } from '../application/services/CompetitionService.js';
import { ResultService } from '../application/services/ResultService.js';
import { PresenceService } from '../application/services/PresenceService.js';
import { AuthController } from '../presentation/controllers/AuthController.js';
import { RankingController } from '../presentation/controllers/RankingController.js';
import { VideoController } from '../presentation/controllers/VideoController.js';
import { CompetitionController } from '../presentation/controllers/CompetitionController.js';
import { ResultController } from '../presentation/controllers/ResultController.js';
import { PresenceController } from '../presentation/controllers/PresenceController.js';
import { models } from './database/models/index.js';
import { cacheService } from './cache/CacheService.js';
import redis from './config/redis.js';

const userRepository = new UserRepository(models);
const wcaProfileRepository = new WcaProfileRepository(models);
const rankingRepository = new RankingRepository(models);
const competitionRepository = new CompetitionRepository(models);
const competitionRoundRepository = new CompetitionRoundRepository(models);
const resultRepository = new ResultRepository(models);

const wcaService = new WcaService(wcaProfileRepository);
const authService = new AuthService(userRepository, rankingRepository);
const rankingService = new RankingService(rankingRepository, cacheService);
const videoService = new VideoService();
const competitionService = new CompetitionService(competitionRepository, competitionRoundRepository, resultRepository);
const resultService = new ResultService(resultRepository, competitionRepository, competitionRoundRepository, rankingService);
const presenceService = new PresenceService(redis, userRepository);

const authController = new AuthController(authService, wcaService);
const rankingController = new RankingController(rankingService);
const videoController = new VideoController(videoService);
const competitionController = new CompetitionController(competitionService);
const resultController = new ResultController(resultService);
const presenceController = new PresenceController(presenceService);

export {
  userRepository,
  wcaProfileRepository,
  rankingRepository,
  competitionRepository,
  competitionRoundRepository,
  resultRepository,
  wcaService,
  authService,
  rankingService,
  videoService,
  competitionService,
  resultService,
  presenceService,
  authController,
  rankingController,
  videoController,
  competitionController,
  resultController,
  presenceController,
  cacheService,
};
