import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/infrastructure/database/models/index.js';
import { cacheService } from '../../src/infrastructure/cache/CacheService.js';
import redis from '../../src/infrastructure/config/redis.js';

const VALID_PASSWORD = 'Abcd1234';

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await cacheService.connect();
});

afterAll(async () => {
  await sequelize.close();
  await cacheService.disconnect();
  await redis.quit();
});

beforeEach(async () => {
  await sequelize.query('TRUNCATE TABLE rankings, wca_profiles, users RESTART IDENTITY CASCADE');
  await cacheService.client.flushDb();
});

describe('GET /api/v1/ranking', () => {
  test('returns empty array when no users have rankings', async () => {
    const res = await request(app).get('/api/v1/ranking');
    expect(res.status).toBe(200);
    expect(res.body.ranking).toEqual([]);
    expect(res.body.event).toBe('3x3');
  });

  test('returns top 100 ordered by Elo descending', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'top@test.com', username: 'topplayer', password: VALID_PASSWORD,
    });
    await request(app).post('/api/v1/auth/register').send({
      email: 'mid@test.com', username: 'midplayer', password: VALID_PASSWORD,
    });

    await sequelize.query(`
      UPDATE rankings r
      SET elo = CASE
        WHEN u.username = 'topplayer' THEN 1200
        WHEN u.username = 'midplayer' THEN 900
      END
      FROM users u WHERE u.id = r.user_id
    `);

    const res = await request(app).get('/api/v1/ranking');
    expect(res.status).toBe(200);
    expect(res.body.ranking.length).toBe(2);
    expect(res.body.ranking[0].username).toBe('topplayer');
    expect(res.body.ranking[0].elo).toBe(1200);
    expect(res.body.ranking[1].username).toBe('midplayer');
  });

  test('accepts event query param', async () => {
    const res = await request(app).get('/api/v1/ranking?event=2x2');
    expect(res.status).toBe(200);
    expect(res.body.event).toBe('2x2');
  });

  test('rejects invalid event', async () => {
    const res = await request(app).get('/api/v1/ranking?event=invalid');
    expect(res.status).toBe(400);
  });

  test('newly registered user gets Elo 1000 and appears in ranking', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'new@test.com', username: 'newplayer', password: VALID_PASSWORD,
    });

    const res = await request(app).get('/api/v1/ranking');
    expect(res.status).toBe(200);
    const entry = res.body.ranking.find(r => r.username === 'newplayer');
    expect(entry).toBeDefined();
    expect(entry.elo).toBe(1000);
    expect(entry.wins).toBe(0);
    expect(entry.losses).toBe(0);
  });
});

describe('GET /api/v1/ranking/users/:userId', () => {
  test('returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/v1/ranking/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  test('returns stats for a user that has a ranking', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'stats@test.com', username: 'statsuser', password: VALID_PASSWORD,
    });
    const userId = registerRes.body.user?.id;

    const res = await request(app).get(`/api/v1/ranking/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.elo).toBe(1000);
    expect(res.body.wins).toBe(0);
    expect(res.body.losses).toBe(0);
    expect(res.body.total_matches).toBe(0);
  });
});
