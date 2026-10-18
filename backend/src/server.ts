import { createApp } from './app';
import { closePool } from './config/database';
import { env } from './config/env';
import { logger } from './shared/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API escuchando en http://localhost:${env.PORT} (docs: /api/docs)`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} recibido, cerrando servidor`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
