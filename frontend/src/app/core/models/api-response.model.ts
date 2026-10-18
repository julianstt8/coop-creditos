/** Mirrors the backend response contract (backend/src/shared/http/api-response.ts). */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Normalized error the UI consumes, whatever the HTTP failure was. */
export interface ApiError extends ApiErrorBody {
  status: number;
}
