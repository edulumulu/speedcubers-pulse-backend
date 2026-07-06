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

describe('GET /api-docs.json', () => {
  it('returns the OpenAPI document', async () => {
    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths['/auth/login']).toBeDefined();
    expect(res.body.paths['/video/usage']).toBeDefined();
  });
});

describe('GET /api-docs', () => {
  it('returns the Swagger UI', async () => {
    const res = await request(app).get('/api-docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('SpeedCubers Pulse API Docs');
  });
});
