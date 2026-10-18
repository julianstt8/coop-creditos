import request from 'supertest';
import { createApp } from '../src/app';

describe('Health', () => {
  const app = createApp();

  it('GET /api/health/live responde 200 con status UP', async () => {
    const response = await request(app).get('/api/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'UP' } });
  });

  it('una ruta inexistente responde 404 con el formato de error estándar', async () => {
    const response = await request(app).get('/api/no-existe');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: expect.any(String) },
    });
  });

  it('un JSON mal formado responde 400 INVALID_JSON', async () => {
    const response = await request(app)
      .post('/api/health/live')
      .set('Content-Type', 'application/json')
      .send('{"mal": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });
});
