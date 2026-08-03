import { Router } from 'express';
import { competitionController } from '../../infrastructure/container.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import resultRoutes from './result.routes.js';
import {
  createCompetitionSchema,
  getCompetitionParamsSchema,
  joinCompetitionSchema,
  updateRoundEventSchema,
} from '../validators/competition.validator.js';

const router = Router();

router.post('/', requireAuth, validate(createCompetitionSchema), competitionController.createRoom);
router.post('/join', requireAuth, validate(joinCompetitionSchema), competitionController.joinRoom);
router.use('/:code/results', resultRoutes);
router.patch(
  '/:code/round/event',
  requireAuth,
  validate(getCompetitionParamsSchema, 'params'),
  validate(updateRoundEventSchema),
  competitionController.updateActiveRoundEvent,
);
router.get('/:code', requireAuth, validate(getCompetitionParamsSchema, 'params'), competitionController.getRoom);

export default router;
