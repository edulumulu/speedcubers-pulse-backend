import { Router } from 'express';
import { competitionController } from '../../infrastructure/container.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../validators/auth.validator.js';
import {
  createCompetitionSchema,
  getCompetitionParamsSchema,
  joinCompetitionSchema,
} from '../validators/competition.validator.js';

const router = Router();

router.post('/', requireAuth, validate(createCompetitionSchema), competitionController.createRoom);
router.post('/join', requireAuth, validate(joinCompetitionSchema), competitionController.joinRoom);
router.get('/:code', requireAuth, validate(getCompetitionParamsSchema, 'params'), competitionController.getRoom);

export default router;
