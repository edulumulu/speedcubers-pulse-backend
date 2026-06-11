export class ResultRepository {
  constructor(models) {
    this.Result = models.Result;
    this.User = models.User;
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

  async create(data) {
    const row = await this.Result.create(data);
    return this.Result.findByPk(row.id, { include: this.includeUser() });
  }
}
