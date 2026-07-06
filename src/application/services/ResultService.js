import { UniqueConstraintError } from 'sequelize';
import { AppError } from '../../domain/errors/AppError.js';
import { finalTimeMsToSeconds, resolveRoundResults } from './RoundResolutionService.js';

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
  if (penalty === '+4') return timeMs + 4000;
  return timeMs;
}

export class ResultService {
  constructor(resultRepository, competitionRepository, competitionRoundRepository, rankingService = null) {
    this.resultRepository = resultRepository;
    this.competitionRepository = competitionRepository;
    this.competitionRoundRepository = competitionRoundRepository;
    this.rankingService = rankingService;
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

    const round = await this.#getOrCreateActiveRound(competition);
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

      const completion = await this.#completeRoundIfReady(competition.id, round);

      return {
        ...serializeResult(row),
        round: {
          id: round.id,
          number: round.round_number,
          event: round.event,
          scramble: round.scramble,
        },
        roundResolution: completion?.roundResolution ?? null,
        nextRound: completion?.nextRound ? serializeRound(completion.nextRound) : null,
      };
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new AppError('Result already submitted', 'RESULT_ALREADY_SUBMITTED', 409);
      }
      throw err;
    }
  }

  async #getOrCreateActiveRound(competition) {
    const active = await this.competitionRoundRepository.findActiveByCompetition(competition.id);
    if (active) return active;
    return this.competitionRoundRepository.createNext(competition.id, competition.event);
  }

  async #completeRoundIfReady(competitionId, round) {
    const roundId = round.id;
    const resultCount = await this.resultRepository.countByRound(roundId);
    if (resultCount < 2) return null;

    await this.competitionRoundRepository.complete(roundId);
    const roundResults = await this.resultRepository.findByRound(roundId);
    const roundResolution = resolveRoundResults(roundResults);

    if (roundResolution.status === 'completed' && this.rankingService) {
      const elo = await this.rankingService.processMatchResult({
        winnerId: roundResolution.winner.id,
        loserId: roundResolution.loser.id,
        winnerTime: finalTimeMsToSeconds(roundResolution.winningTimeMs),
        loserTime: finalTimeMsToSeconds(roundResolution.losingTimeMs),
        loserIsDnf: roundResolution.loserIsDnf,
      });
      roundResolution.elo = {
        winner: elo.newEloWinner,
        loser: elo.newEloLoser,
      };
    }

    const nextRound = await this.competitionRoundRepository.createNext(competitionId, round.event);
    return { roundResolution, nextRound };
  }
}

function serializeRound(round) {
  return {
    id: round.id,
    number: round.round_number,
    event: round.event,
    scramble: round.scramble,
    status: round.status,
  };
}
