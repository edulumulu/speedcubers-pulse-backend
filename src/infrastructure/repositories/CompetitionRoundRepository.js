export class CompetitionRoundRepository {
  constructor(models) {
    this.CompetitionRound = models.CompetitionRound;
  }

  async findActiveByCompetition(competitionId) {
    return this.CompetitionRound.findOne({
      where: { competition_id: competitionId, status: 'active' },
      order: [['round_number', 'DESC']],
    });
  }

  async findLatestByCompetition(competitionId) {
    return this.CompetitionRound.findOne({
      where: { competition_id: competitionId },
      order: [['round_number', 'DESC']],
    });
  }

  async createNext(competitionId) {
    const latest = await this.findLatestByCompetition(competitionId);
    const roundNumber = latest ? latest.round_number + 1 : 1;
    return this.CompetitionRound.create({
      competition_id: competitionId,
      round_number: roundNumber,
      status: 'active',
    });
  }

  async complete(id) {
    await this.CompetitionRound.update({ status: 'completed' }, { where: { id } });
    return this.CompetitionRound.findByPk(id);
  }
}
