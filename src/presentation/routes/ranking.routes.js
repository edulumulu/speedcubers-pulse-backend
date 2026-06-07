import { Router } from 'express';
import { rankingController } from '../../infrastructure/container.js';

const router = Router();

// GET /ranking?event=3x3  — top 100 leaderboard
router.get('/', rankingController.getTop100);

// GET /ranking/users/:userId?event=3x3  — stats for a single user
router.get('/users/:userId', rankingController.getUserStats);

export default router;
