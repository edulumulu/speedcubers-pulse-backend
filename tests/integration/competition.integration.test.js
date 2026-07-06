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

describe('Competition rooms', () => {
  it('creates a waiting room for an authenticated user', async () => {
    const { tokens } = await registerUser('host');

    const res = await request(app)
      .post('/api/v1/competitions')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ event: '3x3' });

    expect(res.status).toBe(201);
    expect(res.body.competition).toMatchObject({
      event: '3x3',
      status: 'waiting',
      host: { username: 'host' },
      guest: null,
    });
    expect(res.body.competition.code).toEqual(expect.stringMatching(/^[A-Z2-9]{6}$/));
    expect(res.body.competition.channelName).toEqual(expect.stringMatching(/^match-[a-z2-9]{6}$/));
  });

  it('lets a second authenticated user join by code', async () => {
    const host = await registerUser('host');
    const guest = await registerUser('guest');
    const createRes = await request(app)
      .post('/api/v1/competitions')
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ event: '3x3' });

    const res = await request(app)
      .post('/api/v1/competitions/join')
      .set('Authorization', `Bearer ${guest.tokens.accessToken}`)
      .send({ code: createRes.body.competition.code.toLowerCase() });

    expect(res.status).toBe(200);
    expect(res.body.competition).toMatchObject({
      code: createRes.body.competition.code,
      channelName: createRes.body.competition.channelName,
      status: 'active',
      host: { username: 'host' },
      guest: { username: 'guest' },
      activeRound: {
        number: 1,
        status: 'active',
      },
    });
    expect(res.body.competition.activeRound.event).toBe('3x3');
    expect(res.body.competition.activeRound.scramble).toEqual(expect.any(String));
    expect(res.body.competition.activeRound.scramble.split(' ')).toHaveLength(20);
  });

  it('lets a participant change the active round event before submitting results', async () => {
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

    const res = await request(app)
      .patch(`/api/v1/competitions/${createRes.body.competition.code}/round/event`)
      .set('Authorization', `Bearer ${guest.tokens.accessToken}`)
      .send({ event: '2x2' });

    expect(res.status).toBe(200);
    expect(res.body.competition.activeRound).toMatchObject({
      number: 1,
      event: '2x2',
      status: 'active',
    });
    expect(res.body.competition.activeRound.scramble.split(' ')).toHaveLength(11);
  });

  it('rejects changing the active round event after a result is submitted', async () => {
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
    await request(app)
      .post(`/api/v1/competitions/${createRes.body.competition.code}/results`)
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({ timeMs: 12000, penalty: 'none' });

    const res = await request(app)
      .patch(`/api/v1/competitions/${createRes.body.competition.code}/round/event`)
      .set('Authorization', `Bearer ${guest.tokens.accessToken}`)
      .send({ event: '2x2' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ROUND_EVENT_LOCKED');
  });

  it('rejects a third user when the room is full', async () => {
    const host = await registerUser('host');
    const guest = await registerUser('guest');
    const third = await registerUser('third');
    const createRes = await request(app)
      .post('/api/v1/competitions')
      .set('Authorization', `Bearer ${host.tokens.accessToken}`)
      .send({});
    await request(app)
      .post('/api/v1/competitions/join')
      .set('Authorization', `Bearer ${guest.tokens.accessToken}`)
      .send({ code: createRes.body.competition.code });

    const res = await request(app)
      .post('/api/v1/competitions/join')
      .set('Authorization', `Bearer ${third.tokens.accessToken}`)
      .send({ code: createRes.body.competition.code });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COMPETITION_FULL');
  });
});
