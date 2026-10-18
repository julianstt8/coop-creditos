import { Router } from 'express';
import { getPool } from '../../config/database';
import { fail, ok } from '../../shared/http/api-response';

export const healthRouter = Router();

/** Liveness: the process is up. Does not touch the database. */
healthRouter.get('/live', (_req, res) => {
  res.json(ok({ status: 'UP', timestamp: new Date().toISOString() }));
});

/** Readiness: the API can serve traffic (database reachable). */
healthRouter.get('/ready', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json(ok({ status: 'UP', database: 'UP' }));
  } catch {
    res.status(503).json(fail('DATABASE_UNAVAILABLE', 'La base de datos no está disponible'));
  }
});
