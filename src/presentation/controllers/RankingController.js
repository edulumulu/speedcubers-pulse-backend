import { handleError } from '../utils/handleError.js';
import { rankingQuerySchema } from '../validators/ranking.validator.js';

export class RankingController {
  constructor(rankingService) {
    this.rankingService = rankingService;
  }

  getTop100 = async (req, res) => {
    try {
      const { error, value } = rankingQuerySchema.validate(req.query);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const data = await this.rankingService.getTop100(value.event);
      res.json({ event: value.event, ranking: data });
    } catch (err) {
      handleError(err, res);
    }
  };

  getUserStats = async (req, res) => {
    try {
      const { error, value } = rankingQuerySchema.validate(req.query);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const { userId } = req.params;
      const stats = await this.rankingService.getUserStats(userId, value.event);

      if (!stats) return res.status(404).json({ error: 'Ranking not found for this user' });

      res.json(stats);
    } catch (err) {
      handleError(err, res);
    }
  };
}
