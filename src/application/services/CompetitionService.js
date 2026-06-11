import crypto from 'crypto';
import { AppError } from '../../domain/errors/AppError.js';

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

function serializeCompetition(row) {
  return {
    id: row.id,
    code: row.code,
    channelName: row.channel_name,
    event: row.event,
    status: row.status,
    host: row.host ? { id: row.host.id, username: row.host.username } : null,
    guest: row.guest ? { id: row.guest.id, username: row.guest.username } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CompetitionService {
  constructor(competitionRepository) {
    this.competitionRepository = competitionRepository;
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
      return serializeCompetition(row);
    }

    if (row.guest_user_id && row.guest_user_id !== userId) {
      throw new AppError('Competition room is full', 'COMPETITION_FULL', 409);
    }

    if (row.status !== 'waiting' && row.guest_user_id !== userId) {
      throw new AppError('Competition room is not joinable', 'COMPETITION_NOT_JOINABLE', 409);
    }

    if (row.guest_user_id === userId) {
      return serializeCompetition(row);
    }

    const updated = await this.competitionRepository.setGuestAndActivate(row.id, userId);
    if (!updated) {
      const latest = await this.competitionRepository.findByCode(normalizedCode);
      if (latest?.guest_user_id && latest.guest_user_id !== userId) {
        throw new AppError('Competition room is full', 'COMPETITION_FULL', 409);
      }
      throw new AppError('Competition room is not joinable', 'COMPETITION_NOT_JOINABLE', 409);
    }

    return serializeCompetition(updated);
  }

  async getRoom({ userId, code }) {
    const row = await this.competitionRepository.findByCode(code.toUpperCase());
    if (!row) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    if (row.host_user_id !== userId && row.guest_user_id !== userId) {
      throw new AppError('Competition room not found', 'COMPETITION_NOT_FOUND', 404);
    }

    return serializeCompetition(row);
  }
}
