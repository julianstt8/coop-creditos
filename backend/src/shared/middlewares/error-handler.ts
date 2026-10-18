import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { fail } from '../http/api-response';
import { logger } from '../logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(fail('ROUTE_NOT_FOUND', `La ruta ${req.method} ${req.path} no existe`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json(fail(error.code, error.message, error.details));
    return;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json(fail('VALIDATION_ERROR', 'Los datos enviados no son válidos', details));
    return;
  }

  if (isJsonSyntaxError(error)) {
    res.status(400).json(fail('INVALID_JSON', 'El cuerpo de la petición no es un JSON válido'));
    return;
  }

  logger.error({ err: error }, 'Unhandled error');
  res.status(500).json(fail('INTERNAL_ERROR', 'Ocurrió un error inesperado'));
};

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}
