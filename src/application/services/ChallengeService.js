import crypto from 'crypto';
import { AppError } from '../../domain/errors/AppError.js';

const CHALLENGE_TTL_SECONDS = 30;
const CHALLENGE_KEY_PREFIX = 'challenge:';
const VALID_CHALLENGE_EVENTS = new Set([
  '2x2',
  '3x3',
  '4x4',
  '5x5',
  '6x6',
  '7x7',
  'oh',
  'pyraminx',
  'skewb',
  'megaminx',
  'fto',
]);

function challengeKey(challengeId) {
  return `${CHALLENGE_KEY_PREFIX}${challengeId}`;
}

function serializeUser(user) {
  if (!user) return null;
  const publicUser = typeof user.toPublic === 'function'
    ? user.toPublic()
    : { id: user.id, username: user.username };
  return {
    id: publicUser.id,
    username: publicUser.username,
  };
}

function parseChallenge(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export class ChallengeService {
  constructor(redis, userRepository, presenceService, competitionService, ttlSeconds = CHALLENGE_TTL_SECONDS) {
    this.redis = redis;
    this.userRepository = userRepository;
    this.presenceService = presenceService;
    this.competitionService = competitionService;
    this.ttlSeconds = ttlSeconds;
  }

  async createChallenge({ challengerId, challengedId, event = '3x3', now = new Date() }) {
    if (!VALID_CHALLENGE_EVENTS.has(event)) {
      throw new AppError('Invalid challenge event', 'INVALID_CHALLENGE_EVENT', 400);
    }

    if (!challengerId || !challengedId || challengerId === challengedId) {
      throw new AppError('Cannot challenge this user', 'INVALID_CHALLENGE_TARGET', 400);
    }

    const [challenger, challenged, isChallengedOnline] = await Promise.all([
      this.userRepository.findById(challengerId),
      this.userRepository.findById(challengedId),
      this.presenceService.isOnline(challengedId),
    ]);

    if (!challenger || !challenged) {
      throw new AppError('Challenge user not found', 'CHALLENGE_USER_NOT_FOUND', 404);
    }

    if (!isChallengedOnline) {
      throw new AppError('User is not online', 'CHALLENGE_USER_OFFLINE', 409);
    }

    const challenge = {
      id: crypto.randomUUID(),
      event,
      challenger: serializeUser(challenger),
      challenged: serializeUser(challenged),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.ttlSeconds * 1000).toISOString(),
    };

    await this.redis.set(challengeKey(challenge.id), JSON.stringify(challenge), 'EX', this.ttlSeconds);
    return challenge;
  }

  async getChallenge(challengeId) {
    if (!challengeId) return null;
    const value = await this.redis.get(challengeKey(challengeId));
    return value ? parseChallenge(value) : null;
  }

  async acceptChallenge({ challengeId, userId }) {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) {
      throw new AppError('Challenge expired', 'CHALLENGE_EXPIRED', 404);
    }

    if (challenge.challenged?.id !== userId) {
      throw new AppError('Challenge not found', 'CHALLENGE_NOT_FOUND', 404);
    }

    const room = await this.competitionService.createRoom({
      userId: challenge.challenger.id,
      event: challenge.event,
    });
    const competition = await this.competitionService.joinRoom({
      userId: challenge.challenged.id,
      code: room.code,
    });

    await this.redis.del(challengeKey(challenge.id));
    return { challenge, competition };
  }

  async rejectChallenge({ challengeId, userId }) {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) return null;

    if (challenge.challenged?.id !== userId) {
      throw new AppError('Challenge not found', 'CHALLENGE_NOT_FOUND', 404);
    }

    await this.redis.del(challengeKey(challenge.id));
    return challenge;
  }

  async cancelChallenge({ challengeId, userId }) {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) return null;

    if (challenge.challenger?.id !== userId) {
      throw new AppError('Challenge not found', 'CHALLENGE_NOT_FOUND', 404);
    }

    await this.redis.del(challengeKey(challenge.id));
    return challenge;
  }
}
