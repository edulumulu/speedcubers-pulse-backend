import { UniqueConstraintError } from 'sequelize';
import { AppError } from '../../domain/errors/AppError.js';

function serializeResult(row) {
  return {
    id: row.id,
    roundId: row.round_id,
    user: row.user ? { id: row.user.id, username: row.user.username } : { id: row.user_id },
    timeMs: row.time_ms,
    penalty: row.penalty,
    finalTimeMs: row.final_time_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function calculateFinalTimeMs(timeMs, penalty) {
  if (penalty === 'dnf') return null;
  if (penalty === '+2') return timeMs + 2000;
  return timeMs;
}

export class ResultService {
  constructor(resultRepository, competitionRepository, competitionRoundRepository) {
    this.resultRepository = resultRepository;
    this.competitionRepository = competitionRepository;
    this.competitionRoundRepository = competitionRoundRepository;
  }

  async submitResult({ userId, code, timeMs, penalty = 'none' }) {
    const competition = await this.competitionRepository.findByCode(code.toUpperCase());

    if (!competition) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    if (competition.host_user_id !== userId && competition.guest_user_id !== userId) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    if (competition.status !== 'active') {
      throw new AppError('Competition is not active', 'COMPETITION_NOT_ACTIVE', 409);
    }

    const round = await this.#getOrCreateActiveRound(competition.id);
    const existing = await this.resultRepository.findByRoundAndUser(round.id, userId);
    if (existing) {
      throw new AppError('Result already submitted', 'RESULT_ALREADY_SUBMITTED', 409);
    }

    try {
      const row = await this.resultRepository.create({
        round_id: round.id,
        user_id: userId,
        time_ms: penalty === 'dnf' ? timeMs ?? null : timeMs,
        penalty,
        final_time_ms: calculateFinalTimeMs(timeMs, penalty),
      });

      await this.#openNextRoundIfComplete(competition.id, round.id);

      return {
        ...serializeResult(row),
        round: {
          id: round.id,
          number: round.round_number,
          scramble: round.scramble,
        },
      };
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new AppError('Result already submitted', 'RESULT_ALREADY_SUBMITTED', 409);
      }
      throw err;
    }
  }

  async #getOrCreateActiveRound(competitionId) {
    const active = await this.competitionRoundRepository.findActiveByCompetition(competitionId);
    if (active) return active;
    return this.competitionRoundRepository.createNext(competitionId);
  }

  async #openNextRoundIfComplete(competitionId, roundId) {
    const resultCount = await this.resultRepository.countByRound(roundId);
    if (resultCount < 2) return;

    await this.competitionRoundRepository.complete(roundId);
    await this.competitionRoundRepository.createNext(competitionId);
  }
}
