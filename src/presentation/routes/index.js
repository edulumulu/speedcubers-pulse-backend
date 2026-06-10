import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import rankingRoutes from './ranking.routes.js';
import videoRoutes from './video.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ranking', rankingRoutes);
router.use('/video', videoRoutes);

export default router;
