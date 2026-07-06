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

  async createNext(competitionId, event = '3x3') {
    const latest = await this.findLatestByCompetition(competitionId);
    const roundNumber = latest ? latest.round_number + 1 : 1;
    return this.CompetitionRound.create({
      competition_id: competitionId,
      round_number: roundNumber,
      event,
      scramble: this.scrambleGenerator.generate(event),
      status: 'active',
    });
  }

  async updateEvent(id, event) {
    await this.CompetitionRound.update(
      {
        event,
        scramble: this.scrambleGenerator.generate(event),
      },
      { where: { id, status: 'active' } },
    );
    return this.CompetitionRound.findByPk(id);
  }

  async complete(id) {
    await this.CompetitionRound.update({ status: 'completed' }, { where: { id } });
    return this.CompetitionRound.findByPk(id);
  }
}
