import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/infrastructure/database/models/index.js';
import redis from '../../src/infrastructure/config/redis.js';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
  await redis.quit();
});

beforeEach(async () => {
  await sequelize.query('TRUNCATE TABLE rankings, wca_profiles, users RESTART IDENTITY CASCADE');
  await redis.del('online:users');
});

describe('GET /api/v1/users/online', () => {
  it('returns an empty list when nobody is online', async () => {
    const res = await request(app).get('/api/v1/users/online');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ users: [] });
  });

  it('returns online users from Redis', async () => {
    await redis.hset('online:users', 'user-1', JSON.stringify({
      id: 'user-1',
      username: 'alice',
      connectedAt: '2026-06-13T08:00:00.000Z',
      lastSeenAt: '2026-06-13T08:00:00.000Z',
    }));

    const res = await request(app).get('/api/v1/users/online');

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([
      expect.objectContaining({ id: 'user-1', username: 'alice' }),
    ]);
  });
});
