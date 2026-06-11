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
  await sequelize.query(
    'TRUNCATE TABLE results, competition_rounds, competitions, rankings, wca_profiles, users RESTART IDENTITY CASCADE',
  );
});

async function registerUser(username) {
  const res = await request(app).post('/api/v1/auth/register').send({
    email: `${username}@test.com`,
    username,
    password: 'Pass123!',
  });
  return res.body;
}

async function createActiveCompetition() {
  const host = await registerUser('host');
  const guest = await registerUser('guest');
  const createRes = await request(app)
    .post('/api/v1/competitions')
    .set('Authorization', `Bearer ${host.tokens.accessToken}`)
    .send({ event: '3x3' });
  await request(app)
    .post('/api/v1/competitions/join')
    .set('Authorization', `Bearer ${guest.tokens.accessToken}`)
    .send({ code: createRes.body.competition.code });

  return {
    host,
    guest,
    code: createRes.body.competition.code,
  };
}

describe('Competition results', () => {
  it('lets a participant submit a timed result', async () => {
    const { host, code } = await createActiveCompetition();

    const res = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ timeMs: 15234, penalty: '+2' });

    expect(res.status).toBe(201);
    expect(res.body.result).toMatchObject({
      penalty: '+2',
      timeMs: 15234,
      finalTimeMs: 17234,
      round: { number: 1 },
      user: { username: 'host' },
    });
  });

  it('lets a participant submit DNF without a time', async () => {
    const { guest, code } = await createActiveCompetition();

    const res = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${guest.tokens.accessToken}`)
      .send({ penalty: 'dnf' });

    expect(res.status).toBe(201);
    expect(res.body.result).toMatchObject({
      penalty: 'dnf',
      timeMs: null,
      finalTimeMs: null,
      round: { number: 1 },
      user: { username: 'guest' },
    });
  });

  it('rejects duplicate submissions from the same user', async () => {
    const { host, code } = await createActiveCompetition();

    await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ timeMs: 15234 });

    const res = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ timeMs: 16234 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('RESULT_ALREADY_SUBMITTED');
  });

  it('opens another round after both participants submit results', async () => {
    const { host, guest, code } = await createActiveCompetition();

    const hostRoundOne = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ timeMs: 15234 });
    const guestRoundOne = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${guest.tokens.accessToken}`)
      .send({ timeMs: 16234 });
    const hostRoundTwo = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ timeMs: 14234 });

    expect(hostRoundOne.status).toBe(201);
    expect(guestRoundOne.status).toBe(201);
    expect(hostRoundTwo.status).toBe(201);
    expect(hostRoundOne.body.result.round.number).toBe(1);
    expect(guestRoundOne.body.result.round.number).toBe(1);
    expect(hostRoundTwo.body.result.round.number).toBe(2);
  });

  it('rejects submissions from non participants', async () => {
    const { code } = await createActiveCompetition();
    const third = await registerUser('third');

    const res = await request(app)
      .post(`/api/v1/competitions/${code}/results`)
      .set('Authorization', `Bearer ${third.tokens.accessToken}`)
      .send({ timeMs: 15234 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COMPETITION_NOT_FOUND');
  });

  it('rejects submissions before the competition is active', async () => {
    const host = await registerUser('host');
    const createRes = await request(app)
      .post('/api/v1/competitions')
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ event: '3x3' });

    const res = await request(app)
      .post(`/api/v1/competitions/${createRes.body.competition.code}/results`)
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ timeMs: 15234 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COMPETITION_NOT_ACTIVE');
  });
});
