export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function ok<T>(data: T, meta?: PaginationMeta): ApiSuccess<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}

export function fail(code: string, message: string, details?: unknown): ApiFailure {
  return details === undefined
    ? { success: false, error: { code, message } }
    : { success: false, error: { code, message, details } };
}
