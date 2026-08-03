import crypto from 'crypto';
import { AppError } from '../../domain/errors/AppError.js';
import { resolveRoundResults } from './RoundResolutionService.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 10;

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

function serializeRound(row) {
  if (!row) return null;
  return {
    id: row.id,
    number: row.round_number,
    event: row.event,
    scramble: row.scramble,
    status: row.status,
  };
}

function serializeCompletedRound(row, results) {
  if (!row) return null;
  return {
    ...serializeRound(row),
    resolution: resolveRoundResults(results),
  };
}

function emptyMatchScore(row) {
  return {
    host: row.host ? { id: row.host.id, username: row.host.username, score: 0 } : null,
    guest: row.guest ? { id: row.guest.id, username: row.guest.username, score: 0 } : null,
    roundsPlayed: 0,
  };
}

function serializeMatchScore(row, results) {
  const score = emptyMatchScore(row);
  const groupedResults = new Map();

  results.forEach((result) => {
    const roundId = result.round_id;
    if (!groupedResults.has(roundId)) groupedResults.set(roundId, []);
    groupedResults.get(roundId).push(result);
  });

  groupedResults.forEach((roundResults) => {
    const resolution = resolveRoundResults(roundResults);
    if (!['completed', 'draw'].includes(resolution.status)) return;

    score.roundsPlayed += 1;
    if (resolution.status !== 'completed') return;
    if (resolution.winner?.id === row.host_user_id && score.host) score.host.score += 1;
    if (resolution.winner?.id === row.guest_user_id && score.guest) score.guest.score += 1;
  });

  return score;
}

function serializeCompetition(row, roundState = {}) {
  return {
    id: row.id,
    code: row.code,
    channelName: row.channel_name,
    event: row.event,
    status: row.status,
    host: row.host ? { id: row.host.id, username: row.host.username } : null,
    guest: row.guest ? { id: row.guest.id, username: row.guest.username } : null,
    activeRound: roundState.activeRound ?? null,
    latestCompletedRound: roundState.latestCompletedRound ?? null,
    matchScore: roundState.matchScore ?? emptyMatchScore(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CompetitionService {
  constructor(competitionRepository, competitionRoundRepository = null, resultRepository = null) {
    this.competitionRepository = competitionRepository;
    this.competitionRoundRepository = competitionRoundRepository;
    this.resultRepository = resultRepository;
  }

  async createRoom({ userId, event = '3x3' }) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = generateCode();
      const existing = await this.competitionRepository.findByCode(code);
      if (existing) continue;

      const row = await this.competitionRepository.create({
        code,
        channel_name: `match-${code.toLowerCase()}`,
        event,
        host_user_id: userId,
      });

      return serializeCompetition(row);
    }

    throw new AppError('Could not generate a unique competition code', 'COMPETITION_CODE_COLLISION', 500);
  }

  async joinRoom({ userId, code }) {
    const normalizedCode = code.toUpperCase();
    const row = await this.competitionRepository.findByCode(normalizedCode);

    if (!row) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    if (row.host_user_id === userId) {
      return serializeCompetition(row, await this.#roundState(row));
    }

    if (row.guest_user_id && row.guest_user_id !== userId) {
      throw new AppError('Competition room is full', 'COMPETITION_FULL', 409);
    }

    if (row.status !== 'waiting' && row.guest_user_id !== userId) {
      throw new AppError('Competition room is not joinable', 'COMPETITION_NOT_JOINABLE', 409);
    }

    if (row.guest_user_id === userId) {
      return serializeCompetition(row, await this.#roundState(row));
    }

    const updated = await this.competitionRepository.setGuestAndActivate(row.id, userId);
    if (!updated) {
      const latest = await this.competitionRepository.findByCode(normalizedCode);
      if (latest?.guest_user_id && latest.guest_user_id !== userId) {
        throw new AppError('Competition room is full', 'COMPETITION_FULL', 409);
      }
      throw new AppError('Competition room is not joinable', 'COMPETITION_NOT_JOINABLE', 409);
    }

    if (this.competitionRoundRepository) {
      await this.competitionRoundRepository.createNext(updated.id, updated.event);
    }

    return serializeCompetition(updated, await this.#roundState(updated));
  }

  async getRoom({ userId, code }) {
    const row = await this.competitionRepository.findByCode(code.toUpperCase());
    if (!row) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    if (row.host_user_id !== userId && row.guest_user_id !== userId) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    return serializeCompetition(row, await this.#roundState(row));
  }

  async updateActiveRoundEvent({ userId, code, event }) {
    const row = await this.competitionRepository.findByCode(code.toUpperCase());
    if (!row) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    if (row.host_user_id !== userId && row.guest_user_id !== userId) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    if (row.status !== 'active') {
      throw new AppError('Competition is not active', 'COMPETITION_NOT_ACTIVE', 409);
    }

    if (!this.competitionRoundRepository || !this.resultRepository) {
      throw new AppError('Competition round is not available', 'COMPETITION_ROUND_NOT_AVAILABLE', 409);
    }

    const activeRound = await this.competitionRoundRepository.findActiveByCompetition(row.id);
    if (!activeRound) {
      throw new AppError('Competition round is not available', 'COMPETITION_ROUND_NOT_AVAILABLE', 409);
    }

    const resultCount = await this.resultRepository.countByRound(activeRound.id);
    if (resultCount > 0) {
      throw new AppError('Round event cannot change after results are submitted', 'ROUND_EVENT_LOCKED', 409);
    }

    await this.competitionRoundRepository.updateEvent(activeRound.id, event);
    return serializeCompetition(row, await this.#roundState(row));
  }

  async #roundState(competition) {
    if (!this.competitionRoundRepository || !this.resultRepository) return {};
    const competitionId = competition.id;

    const [activeRoundRow, latestCompletedRoundRow] = await Promise.all([
      this.competitionRoundRepository.findActiveByCompetition(competitionId),
      this.competitionRoundRepository.findLatestCompletedByCompetition(competitionId),
    ]);

    const [completedResults, matchResults] = await Promise.all([
      latestCompletedRoundRow ? this.resultRepository.findByRound(latestCompletedRoundRow.id) : [],
      this.resultRepository.findCompletedByCompetition
        ? this.resultRepository.findCompletedByCompetition(competitionId)
        : [],
    ]);

    return {
      activeRound: serializeRound(activeRoundRow),
      latestCompletedRound: serializeCompletedRound(latestCompletedRoundRow, completedResults),
      matchScore: serializeMatchScore(competition, matchResults),
    };
  }
}
