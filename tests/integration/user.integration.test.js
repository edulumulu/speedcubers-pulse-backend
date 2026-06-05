import request from 'supertest';
import app from '../../src/app.js';
import { sequelize } from '../../src/infrastructure/database/models/index.js';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await sequelize.query('TRUNCATE TABLE wca_profiles, users RESTART IDENTITY CASCADE');
});

const validUser = {
  email: 'alice@test.com',
  username: 'alice',
  password: 'Pass123!',
};

async function registerAndGetToken(user = validUser) {
  const res = await request(app).post('/api/v1/auth/register').send(user);
  return res.body.tokens.accessToken;
}

describe('GET /api/v1/users/:username', () => {
  it('returns 200 with public profile for existing user', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);

    const res = await request(app).get(`/api/v1/users/${validUser.username}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(validUser.username);
    expect(res.body.user.email).toBeUndefined();
  });

  it('returns 404 for unknown username', async () => {
    const res = await request(app).get('/api/v1/users/nobody');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });
});

describe('GET /api/v1/users/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with private profile for authenticated user', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.username).toBe(validUser.username);
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('returns 200 and updates email', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'newalice@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('newalice@test.com');
  });

  it('returns 400 when no fields are provided', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 422 when changing username too soon after previous change', async () => {
    const token = await registerAndGetToken();

    // First username change succeeds
    await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'alicenew' });

    // Second username change immediately after should fail
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'alicenewer' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('USERNAME_CHANGE_TOO_SOON');
  });
});

describe('DELETE /api/v1/users/me', () => {
  it('returns 204 and anonymizes the account', async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).delete('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});
