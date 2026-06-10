import request from 'supertest';
import app from '../../src/app.js';
import redis from '../../src/infrastructure/config/redis.js';

afterAll(async () => {
  await redis.quit();
});

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
