import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/infrastructure/database/models/index.js';
import redis from '../../src/infrastructure/config/redis.js';
import { REDIS_LOGIN_FAIL_PREFIX, REDIS_LOGIN_LOCK_PREFIX } from '../../src/infrastructure/config/constants.js';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
  await redis.quit();
});

beforeEach(async () => {
  await sequelize.query('TRUNCATE TABLE video_global_usage, wca_profiles, users RESTART IDENTITY CASCADE');
  // Clear login lockout keys so tests don't bleed into each other
  const lockKeys = await redis.keys(`${REDIS_LOGIN_LOCK_PREFIX}*`);
  const failKeys = await redis.keys(`${REDIS_LOGIN_FAIL_PREFIX}*`);
  const keysToDelete = [...lockKeys, ...failKeys];
  if (keysToDelete.length > 0) await redis.del(...keysToDelete);
});

const validUser = {
  email: 'alice@test.com',
  username: 'alice',
  password: 'Pass123!',
};

function refreshCookieHeader(response) {
  return response.headers['set-cookie']
    ?.find((cookie) => cookie.startsWith('refresh_token='))
    ?.split(';')[0];
}

function currentVideoQuotaMonth() {
  const now = new Date();
  return {
    monthStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString(),
    resetAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)).toISOString(),
  };
}

describe('GET /api/v1/auth/check', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'eduardo@speedcubers.dev',
      username: 'edulumulu',
      password: 'Abcd1234',
    });
  });

  it('returns taken:true for an existing username', async () => {
    const res = await request(app).get('/api/v1/auth/check?username=edulumulu');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: { taken: true } });
  });

  it('returns taken:false for a non-existing username', async () => {
    const res = await request(app).get('/api/v1/auth/check?username=notexists');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: { taken: false } });
  });

  it('returns taken:true for an existing email', async () => {
    const res = await request(app).get('/api/v1/auth/check?email=eduardo@speedcubers.dev');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: { taken: true } });
  });

  it('returns 400 when no params are provided', async () => {
    const res = await request(app).get('/api/v1/auth/check');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });
});

describe('POST /api/v1/auth/register', () => {
  it('creates a user and returns 201 with tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeUndefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.join(';')).toContain('refresh_token=');
    expect(res.headers['set-cookie']?.join(';')).toContain('HttpOnly');
  });

  it('returns 409 when email is already taken', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, username: 'bob' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('returns 409 when username is already taken', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'bob@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USERNAME_TAKEN');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password lacks uppercase letter', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, password: 'pass123!' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
  });

  it('returns 200 with tokens for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeUndefined();
    expect(res.headers['set-cookie']?.join(';')).toContain('refresh_token=');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'Wrong123!' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'Pass123!' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns new tokens for a valid refresh cookie', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const cookie = refreshCookieHeader(registerRes);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeUndefined();
    expect(res.body.user.username).toBe(validUser.username);
  });

  it('returns new tokens using the refresh cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(validUser);

    const res = await agent
      .post('/api/v1/auth/refresh')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeUndefined();
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('returns 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'bad.token' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/login — lockout', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
  });

  it('returns 429 after LOGIN_LOCKOUT_ATTEMPTS consecutive wrong passwords', async () => {
    // Trigger 10 failed attempts
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUser.email, password: 'WrongPass123!' });
    }

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
  }, 15000);
});

describe('POST /api/v1/auth/logout', () => {
  it('returns 204 for authenticated user', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const { accessToken } = registerRes.body.tokens;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie']?.join(';')).toContain('refresh_token=;');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('returns 200 with success message for a known email', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: validUser.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('If the email exists, a reset link has been sent');
  });

  it('returns 200 for unknown email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('If the email exists, a reset link has been sent');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  it('returns 400 for an invalid or expired token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'bad-token', password: 'NewPass123!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid or expired reset token');
  });

  it('resets password successfully and allows login with new password', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    // Manually plant a reset token in Redis
    const token = 'test-reset-token-integration';
    const userRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    // Get user id by inspecting the token payload
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.decode(userRes.body.tokens.accessToken);
    await redis.set(`pwd_reset:${token}`, payload.sub, 'EX', 900);

    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NewPass999!' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toBe('Password updated successfully');

    // Login with new password should work
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'NewPass999!' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.tokens.accessToken).toBeDefined();
  });
});

describe('POST /api/v1/video/token', () => {
  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/video/token')
      .send({ channelName: 'match-test' });

    expect(res.status).toBe(401);
  });

  it('returns a video token for an authenticated user', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const { accessToken } = registerRes.body.tokens;

    const res = await request(app)
      .post('/api/v1/video/token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channelName: 'match-test' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      appId: process.env.AGORA_APP_ID,
      channelName: 'match-test',
    });
    expect(res.body.uid).toEqual(expect.any(Number));
    expect(res.body.token).toEqual(expect.stringMatching(/^007/));
    expect(res.body.expiresAt).toBeDefined();
    expect(res.body.quota).toMatchObject({
      limitSeconds: 3600,
      usedSeconds: 0,
      remainingSeconds: 3600,
      global: {
        limitSeconds: 480000,
        usedSeconds: 0,
        remainingSeconds: 480000,
      },
    });
    expect(res.body.quota.resetAt).toBeDefined();
    expect(res.body.quota.global.resetAt).toBeDefined();
  });

  it('rejects video tokens when the global monthly quota is exhausted', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const { accessToken } = registerRes.body.tokens;

    const { monthStart, resetAt } = currentVideoQuotaMonth();
    await sequelize.query(`
      INSERT INTO video_global_usage (month_start, seconds_used, reset_at, created_at, updated_at)
      VALUES (:monthStart, 480000, :resetAt, NOW(), NOW())
    `, { replacements: { monthStart, resetAt } });

    const res = await request(app)
      .post('/api/v1/video/token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channelName: 'match-test' });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('VIDEO_GLOBAL_QUOTA_EXCEEDED');
    expect(res.body.error).toBe('El cupo gratuito mensual de vídeo se ha agotado temporalmente');
  });

  it('returns 400 for invalid channel name', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const { accessToken } = registerRes.body.tokens;

    const res = await request(app)
      .post('/api/v1/video/token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channelName: 'bad channel name' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/video/usage', () => {
  it('stores consumed video seconds for an authenticated user', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const { accessToken } = registerRes.body.tokens;

    const res = await request(app)
      .post('/api/v1/video/usage')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ seconds: 90 });

    expect(res.status).toBe(200);
    expect(res.body.quota).toMatchObject({
      limitSeconds: 3600,
      usedSeconds: 90,
      remainingSeconds: 3510,
      global: {
        limitSeconds: 480000,
        usedSeconds: 90,
        remainingSeconds: 479910,
      },
    });
  });

  it('rejects video tokens when the monthly quota is exhausted', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(validUser);
    const { accessToken } = registerRes.body.tokens;

    await request(app)
      .post('/api/v1/video/usage')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ seconds: 3600 });

    const res = await request(app)
      .post('/api/v1/video/token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channelName: 'match-test' });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('VIDEO_QUOTA_EXCEEDED');
    expect(res.body.error).toBe('Se ha agotado tu prueba gratuita mensual');
  });
});
