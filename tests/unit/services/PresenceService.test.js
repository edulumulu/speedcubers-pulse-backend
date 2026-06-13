import { jest } from '@jest/globals';
import { PresenceService } from '../../../src/application/services/PresenceService.js';

function makeRedis() {
  const store = new Map();
  return {
    hset: jest.fn(async (_key, field, value) => {
      store.set(field, value);
      return 1;
    }),
    hget: jest.fn(async (_key, field) => store.get(field) ?? null),
    hdel: jest.fn(async (_key, field) => {
      store.delete(field);
      return 1;
    }),
    hvals: jest.fn(async () => [...store.values()]),
  };
}

const userRepository = {
  findById: jest.fn(),
};

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    username: 'alice',
    toPublic: () => ({ id: 'user-1', username: 'alice' }),
    ...overrides,
  };
}

describe('PresenceService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores a user as online', async () => {
    const redis = makeRedis();
    userRepository.findById.mockResolvedValue(makeUser());
    const service = new PresenceService(redis, userRepository);

    const result = await service.setOnline('user-1', new Date('2026-06-13T08:00:00.000Z'));

    expect(result).toEqual({
      id: 'user-1',
      username: 'alice',
      connectedAt: '2026-06-13T08:00:00.000Z',
      lastSeenAt: '2026-06-13T08:00:00.000Z',
    });
    expect(redis.hset).toHaveBeenCalledWith('online:users', 'user-1', JSON.stringify(result));
  });

  it('refreshes lastSeenAt without changing connectedAt', async () => {
    const redis = makeRedis();
    userRepository.findById.mockResolvedValue(makeUser());
    const service = new PresenceService(redis, userRepository);

    await service.setOnline('user-1', new Date('2026-06-13T08:00:00.000Z'));
    const result = await service.refresh('user-1', new Date('2026-06-13T08:01:00.000Z'));

    expect(result.connectedAt).toBe('2026-06-13T08:00:00.000Z');
    expect(result.lastSeenAt).toBe('2026-06-13T08:01:00.000Z');
  });

  it('lists online users sorted by username', async () => {
    const redis = makeRedis();
    userRepository.findById
      .mockResolvedValueOnce(makeUser({ id: 'user-2', username: 'zoe', toPublic: () => ({ id: 'user-2', username: 'zoe' }) }))
      .mockResolvedValueOnce(makeUser({ id: 'user-1', username: 'alice', toPublic: () => ({ id: 'user-1', username: 'alice' }) }));
    const service = new PresenceService(redis, userRepository);

    await service.setOnline('user-2');
    await service.setOnline('user-1');

    await expect(service.listOnlineUsers()).resolves.toMatchObject([
      { id: 'user-1', username: 'alice' },
      { id: 'user-2', username: 'zoe' },
    ]);
  });

  it('removes a user from online presence', async () => {
    const redis = makeRedis();
    const service = new PresenceService(redis, userRepository);

    await service.setOffline('user-1');

    expect(redis.hdel).toHaveBeenCalledWith('online:users', 'user-1');
  });
});
