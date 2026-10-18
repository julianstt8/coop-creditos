import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers["x-api-key"]'],
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});
