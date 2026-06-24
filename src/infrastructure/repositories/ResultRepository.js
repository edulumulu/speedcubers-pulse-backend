export class ResultRepository {
  constructor(models) {
    this.Result = models.Result;
    this.User = models.User;
    this.CompetitionRound = models.CompetitionRound;
  }

  includeUser() {
    return [{ model: this.User, as: 'user', attributes: ['id', 'username'] }];
  }

  async findByRoundAndUser(roundId, userId) {
    return this.Result.findOne({
      where: { round_id: roundId, user_id: userId },
      include: this.includeUser(),
    });
  }

  async countByRound(roundId) {
    return this.Result.count({ where: { round_id: roundId } });
  }

  async findByRound(roundId) {
    return this.Result.findAll({
      where: { round_id: roundId },
      include: this.includeUser(),
      order: [['created_at', 'ASC']],
    });
  }

  async findCompletedByCompetition(competitionId) {
    return this.Result.findAll({
      include: [
        ...this.includeUser(),
        {
          model: this.CompetitionRound,
          as: 'round',
          attributes: ['id', 'round_number', 'status'],
          where: { competition_id: competitionId, status: 'completed' },
          required: true,
        },
      ],
      order: [
        [{ model: this.CompetitionRound, as: 'round' }, 'round_number', 'ASC'],
        ['created_at', 'ASC'],
      ],
    });
  }

  async create(data) {
    const row = await this.Result.create(data);
    return this.Result.findByPk(row.id, { include: this.includeUser() });
  }
}
