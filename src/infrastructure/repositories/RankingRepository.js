export class RankingRepository {
  constructor(models) {
    this.Ranking = models.Ranking;
    this.User = models.User;
    this.WcaProfile = models.WcaProfile;
  }

  async findByUserId(userId, event = '3x3') {
    return this.Ranking.findOne({
      where: { user_id: userId, event },
      include: [
        {
          model: this.User,
          as: 'user',
          attributes: ['id', 'username'],
          required: false,
          include: [
            {
              model: this.WcaProfile,
              as: 'wcaProfile',
              attributes: ['wca_id'],
              required: false,
            },
          ],
        },
      ],
    });
  }

  async upsert(userId, fields, event = '3x3') {
    const [row] = await this.Ranking.upsert(
      { user_id: userId, event, ...fields },
      { returning: true },
    );
    return row;
  }

  async findTop100(event = '3x3', limit = 100) {
    return this.Ranking.findAll({
      where: { event },
      limit,
      order: [['elo', 'DESC']],
      include: [
        {
          model: this.User,
          as: 'user',
          attributes: ['id', 'username'],
          where: { deleted_at: null },
          required: true,
          include: [
            {
              model: this.WcaProfile,
              as: 'wcaProfile',
              attributes: ['wca_id'],
              required: false,
            },
          ],
        },
      ],
    });
  }
}
