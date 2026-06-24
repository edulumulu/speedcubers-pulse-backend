import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/infrastructure/database/models/index.js';
import redis from '../../src/infrastructure/config/redis.js';
import { cacheService } from '../../src/infrastructure/cache/CacheService.js';

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
  await sequelize.query(
    'TRUNCATE TABLE results, competition_rounds, competitions, rankings, wca_profiles, users RESTART IDENTITY CASCADE',
  );
  await cacheService.client.flushDb();
});

async function registerUser(username) {
  const res = await request(app).post('/api/v1/auth/register').send({
    email: `${username}@test.com`,
    username,
    password: 'Pass123!',
  });
  return res.body;
}

// ─── 401 — No token ──────────────────────────────────────────────────────────

describe('401 — protected endpoints reject requests without a token', () => {
  const protectedEndpoints = [
    { method: 'get', path: '/api/v1/users/me' },
    { method: 'patch', path: '/api/v1/users/me' },
    { method: 'delete', path: '/api/v1/users/me' },
    { method: 'post', path: '/api/v1/video/token' },
    { method: 'post', path: '/api/v1/competitions' },
    { method: 'post', path: '/api/v1/competitions/join' },
    { method: 'get', path: '/api/v1/competitions/FAKE01' },
    { method: 'post', path: '/api/v1/competitions/FAKE01/results' },
  ];

  for (const { method, path } of protectedEndpoints) {
    it(`${method.toUpperCase()} ${path} → 401`, async () => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    });
  }
});

// ─── 401 — Invalid token ─────────────────────────────────────────────────────

describe('401 — protected endpoints reject an invalid/expired token', () => {
  it('GET /api/v1/users/me → 401 with a garbage token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

// ─── 403 — Cross-user access ─────────────────────────────────────────────────

describe('403 — users cannot access resources belonging to others', () => {
  it('GET /api/v1/users/:username/private — other user cannot see private profile', async () => {
    await registerUser('alice');
    const { tokens: bobTokens } = await registerUser('bob');

    const res = await request(app)
      .get('/api/v1/users/alice')
      .set('Authorization', `Bearer ${bobTokens.accessToken}`);

    // Public profile is allowed, but it must not expose private fields
    if (res.status === 200) {
      expect(res.body).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('email');
    } else {
      expect([403, 404]).toContain(res.status);
    }
  });

  it('PATCH /api/v1/users/me — injected userId in body is rejected by validation', async () => {
    const { tokens: aliceTokens, user: alice } = await registerUser('alice');
    const { user: bob } = await registerUser('bob');

    // Alice tries to patch Bob's profile by injecting his userId in the body:
    // the Joi validator rejects unknown keys, blocking mass-assignment
    const injected = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceTokens.accessToken}`)
      .send({ userId: bob.id, username: 'hacked' });

    expect(injected.status).toBe(400);

    // Without the injected key, the update applies to the JWT's user only
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${aliceTokens.accessToken}`)
      .send({ username: 'hacked' });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(alice.id);
    expect(res.body.user.username).toBe('hacked');
  });

  it('POST /api/v1/competitions/:code/results — outsider cannot submit a result', async () => {
    const { tokens: hostTokens } = await registerUser('host');
    const { tokens: guestTokens } = await registerUser('guest');
    const { tokens: outsiderTokens } = await registerUser('outsider');

    const createRes = await request(app)
      .post('/api/v1/competitions')
      .set('Authorization', `Bearer ${hostTokens.accessToken}`)
      .send({ event: '3x3' });
    const { code } = createRes.body.competition;

    await request(app)
      .post('/api/v1/competitions/join')
      .set('Authorization', `Bearer ${guestTokens.accessToken}`)
      .send({ code });

    const res = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${outsiderTokens.accessToken}`)
      .send({ timeMs: 10000, penalty: 'none' });

    // 404 on purpose: the API does not reveal the room exists (anti-enumeration)
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/competitions/:code — outsider cannot read a private room', async () => {
    const { tokens: hostTokens } = await registerUser('host');
    const { tokens: outsiderTokens } = await registerUser('outsider');

    const createRes = await request(app)
      .post('/api/v1/competitions')
      .set('Authorization', `Bearer ${hostTokens.accessToken}`)
      .send({ event: '3x3' });
    const { code } = createRes.body.competition;

    const res = await request(app)
      .get(`/api/v1/competitions/${code}`)
      .set('Authorization', `Bearer ${outsiderTokens.accessToken}`);

    // 404 on purpose: the API does not reveal the room exists (anti-enumeration)
    expect(res.status).toBe(404);
  });
});
