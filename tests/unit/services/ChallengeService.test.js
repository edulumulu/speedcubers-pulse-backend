import { jest } from '@jest/globals';
import { ChallengeService } from '../../../src/application/services/ChallengeService.js';

function makeRedis() {
  const store = new Map();
  return {
    set: jest.fn(async (key, value) => {
      store.set(key, value);
      return 'OK';
    }),
    get: jest.fn(async (key) => store.get(key) ?? null),
    del: jest.fn(async (key) => {
      store.delete(key);
      return 1;
    }),
  };
}

function makeUser(id, username) {
  return {
    id,
    username,
    toPublic: () => ({ id, username }),
  };
}

const challenger = makeUser('user-1', 'alice');
const challenged = makeUser('user-2', 'bob');

function makeService({ online = true } = {}) {
  const redis = makeRedis();
  const userRepository = {
    findById: jest.fn(async (id) => {
      if (id === challenger.id) return challenger;
      if (id === challenged.id) return challenged;
      return null;
    }),
  };
  const presenceService = {
    isOnline: jest.fn(async () => online),
  };
  const competitionService = {
    createRoom: jest.fn(async () => ({ code: 'ABC123', event: '3x3', status: 'waiting' })),
    joinRoom: jest.fn(async () => ({ code: 'ABC123', event: '3x3', status: 'active' })),
  };

  return {
    redis,
    userRepository,
    presenceService,
    competitionService,
    service: new ChallengeService(redis, userRepository, presenceService, competitionService, 30),
  };
}

describe('ChallengeService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a challenge for an online user', async () => {
    const { redis, service } = makeService();

    const challenge = await service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenged.id,
      event: '2x2',
      now: new Date('2026-08-03T10:00:00.000Z'),
    });

    expect(challenge).toMatchObject({
      event: '2x2',
      challenger: { id: 'user-1', username: 'alice' },
      challenged: { id: 'user-2', username: 'bob' },
      createdAt: '2026-08-03T10:00:00.000Z',
      expiresAt: '2026-08-03T10:00:30.000Z',
    });
    expect(redis.set).toHaveBeenCalledWith(
      `challenge:${challenge.id}`,
      JSON.stringify(challenge),
      'EX',
      30,
    );
  });

  it('rejects challenges to offline users', async () => {
    const { service } = makeService({ online: false });

    await expect(service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenged.id,
    })).rejects.toMatchObject({ code: 'CHALLENGE_USER_OFFLINE', status: 409 });
  });

  it('rejects self challenges', async () => {
    const { service } = makeService();

    await expect(service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenger.id,
    })).rejects.toMatchObject({ code: 'INVALID_CHALLENGE_TARGET', status: 400 });
  });

  it('rejects invalid events', async () => {
    const { service } = makeService();

    await expect(service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenged.id,
      event: '../bad',
    })).rejects.toMatchObject({ code: 'INVALID_CHALLENGE_EVENT', status: 400 });
  });

  it('accepts a challenge and creates an active competition', async () => {
    const { competitionService, service } = makeService();
    const challenge = await service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenged.id,
      event: '3x3',
    });

    const result = await service.acceptChallenge({
      challengeId: challenge.id,
      userId: challenged.id,
    });

    expect(competitionService.createRoom).toHaveBeenCalledWith({ userId: challenger.id, event: '3x3' });
    expect(competitionService.joinRoom).toHaveBeenCalledWith({ userId: challenged.id, code: 'ABC123' });
    expect(result.competition).toMatchObject({ code: 'ABC123', status: 'active' });
    await expect(service.getChallenge(challenge.id)).resolves.toBeNull();
  });

  it('rejects and deletes a challenge', async () => {
    const { service } = makeService();
    const challenge = await service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenged.id,
    });

    await expect(service.rejectChallenge({
      challengeId: challenge.id,
      userId: challenged.id,
    })).resolves.toMatchObject({ id: challenge.id });
    await expect(service.getChallenge(challenge.id)).resolves.toBeNull();
  });

  it('cancels and deletes a challenge by the challenger', async () => {
    const { service } = makeService();
    const challenge = await service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenged.id,
    });

    await expect(service.cancelChallenge({
      challengeId: challenge.id,
      userId: challenger.id,
    })).resolves.toMatchObject({ id: challenge.id });
    await expect(service.getChallenge(challenge.id)).resolves.toBeNull();
  });

  it('rejects challenge cancellation by the challenged user', async () => {
    const { service } = makeService();
    const challenge = await service.createChallenge({
      challengerId: challenger.id,
      challengedId: challenged.id,
    });

    await expect(service.cancelChallenge({
      challengeId: challenge.id,
      userId: challenged.id,
    })).rejects.toMatchObject({ code: 'CHALLENGE_NOT_FOUND', status: 404 });
  });
});
