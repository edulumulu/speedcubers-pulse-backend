import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import rankingRoutes from './ranking.routes.js';
import videoRoutes from './video.routes.js';
import competitionRoutes from './competition.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ranking', rankingRoutes);
router.use('/video', videoRoutes);
router.use('/competitions', competitionRoutes);

export default router;
