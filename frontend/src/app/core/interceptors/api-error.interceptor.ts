import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import type { ApiError, ApiFailure } from '../models/api-response.model';

/**
 * Converts any HTTP failure into an ApiError so components only handle one shape.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toApiError(error))));

function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, code: 'UNKNOWN_ERROR', message: 'Ocurrió un error inesperado' };
  }

  if (error.status === 0) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.',
    };
  }

  if (isApiFailure(error.error)) {
    return { status: error.status, ...error.error.error };
  }

  return {
    status: error.status,
    code: 'HTTP_ERROR',
    message: 'El servidor respondió con un error. Intenta de nuevo en unos minutos.',
  };
}

function isApiFailure(body: unknown): body is ApiFailure {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as ApiFailure).success === false &&
    typeof (body as ApiFailure).error?.code === 'string'
  );
}
