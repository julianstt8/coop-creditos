/**
 * Expected (business or request) error. The error handler turns it into the
 * standard response: { success: false, error: { code, message, details? } }.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(code: string, message: string, details?: unknown): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Autenticación requerida'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'No tienes permiso para esta acción'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(code: string, message: string): AppError {
    return new AppError(404, code, message);
  }

  static conflict(code: string, message: string): AppError {
    return new AppError(409, code, message);
  }

  static unprocessable(code: string, message: string, details?: unknown): AppError {
    return new AppError(422, code, message, details);
  }
}
