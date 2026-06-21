import { ScrambleGenerator } from '../../domain/entities/ScrambleGenerator.js';

export class CompetitionRoundRepository {
  constructor(models, scrambleGenerator = new ScrambleGenerator()) {
    this.CompetitionRound = models.CompetitionRound;
    this.scrambleGenerator = scrambleGenerator;
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

  async findLatestCompletedByCompetition(competitionId) {
    return this.CompetitionRound.findOne({
      where: { competition_id: competitionId, status: 'completed' },
      order: [['round_number', 'DESC']],
    });
  }

  async createNext(competitionId) {
    const latest = await this.findLatestByCompetition(competitionId);
    const roundNumber = latest ? latest.round_number + 1 : 1;
    return this.CompetitionRound.create({
      competition_id: competitionId,
      round_number: roundNumber,
      scramble: this.scrambleGenerator.generate(),
      status: 'active',
    });
  }

  async complete(id) {
    await this.CompetitionRound.update({ status: 'completed' }, { where: { id } });
    return this.CompetitionRound.findByPk(id);
  }
}
