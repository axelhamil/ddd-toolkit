const STATUS_BY_SUFFIX = {
  _UNAUTHORIZED: 401,
  _REQUIRED: 401,
  _FORBIDDEN: 403,
  _NOT_FOUND: 404,
  _CONFLICT: 409,
  _BLOCKED: 409,
  _INVALID: 400,
  _INTEGRITY_FAILED: 422,
  _RATE_LIMITED: 429,
  _PROVIDER_FAILURE: 502,
  _UNAVAILABLE: 503,
  _TIMEOUT: 504,
} as const;

export type ErrorSuffix = keyof typeof STATUS_BY_SUFFIX;
export type ErrorStatus = (typeof STATUS_BY_SUFFIX)[ErrorSuffix];

/**
 * A `SCREAMING_SNAKE` error code whose suffix encodes its HTTP status, e.g.
 * `USER_NOT_FOUND` → 404, `EMAIL_CONFLICT` → 409. The taxonomy keeps domain
 * errors transport-agnostic while mapping cleanly to HTTP at the edge.
 */
export type ErrorCode = `${Uppercase<string>}${ErrorSuffix}`;

export interface AppError<Code extends ErrorCode = ErrorCode> {
  code: Code;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Derive the HTTP status from an error code's suffix. */
export function httpStatusFromCode(code: ErrorCode): ErrorStatus {
  const suffix = (Object.keys(STATUS_BY_SUFFIX) as ErrorSuffix[]).find((s) => code.endsWith(s));
  if (!suffix) throw new Error(`Unreachable: code ${code} has no recognised suffix`);
  return STATUS_BY_SUFFIX[suffix];
}

/** Throwable form of an `AppError`, for boundaries that expect exceptions. */
export class AppErrorException extends Error {
  readonly code: ErrorCode;
  readonly metadata?: Record<string, unknown>;

  constructor(error: AppError) {
    super(error.message);
    this.name = 'AppErrorException';
    this.code = error.code;
    this.metadata = error.metadata;
  }
}
