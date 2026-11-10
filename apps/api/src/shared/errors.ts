import { API_MESSAGES, type ApiErrorEnvelope } from '@readonly/shared';
import type { z } from 'zod';

export interface AppErrorOptions {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  data?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly code: string;
  readonly data?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.statusCode = options.statusCode;
    this.error = options.error;
    this.code = options.code;
    if (options.data !== undefined) {
      this.data = options.data;
    }
  }

  toEnvelope(): ApiErrorEnvelope {
    return {
      statusCode: this.statusCode,
      error: this.error,
      code: this.code,
      message: this.message,
      ...(this.data !== undefined ? { data: this.data } : {}),
    };
  }
}

export function createValidationError(
  message: string,
  field?: string,
): AppError {
  return new AppError({
    statusCode: 422,
    error: 'Unprocessable Entity',
    code: 'invalid_request',
    message,
    ...(field !== undefined ? { data: { field } } : {}),
  });
}

export function createInvalidCredentialsError(
  message: string = API_MESSAGES.INVALID_CREDENTIALS,
): AppError {
  return new AppError({
    statusCode: 422,
    error: 'Unprocessable Entity',
    code: 'invalid_credentials',
    message,
  });
}

export function createUserNotFoundError(
  message: string = API_MESSAGES.USER_NOT_FOUND,
): AppError {
  return new AppError({
    statusCode: 422,
    error: 'Unprocessable Entity',
    code: 'user_not_found',
    message,
  });
}

export function createAccountInactiveError(
  message: string = API_MESSAGES.ACCOUNT_INACTIVE,
): AppError {
  return new AppError({
    statusCode: 403,
    error: 'Forbidden',
    code: 'account_inactive',
    message,
  });
}

export function createSessionNotFoundError(
  message: string = API_MESSAGES.UNAUTHORIZED,
): AppError {
  return new AppError({
    statusCode: 401,
    error: 'Unauthorized',
    code: 'session_not_found',
    message,
  });
}

export function createNotFoundError(
  message = 'Resource tidak ditemukan.',
  code = 'not_found',
): AppError {
  return new AppError({
    statusCode: 404,
    error: 'Not Found',
    code,
    message,
  });
}

export function createGenreInUseError(
  message: string = API_MESSAGES.GENRE_IN_USE,
): AppError {
  return new AppError({
    statusCode: 409,
    error: 'Conflict',
    code: 'genre_in_use',
    message,
  });
}

export function createForbiddenError(
  message: string = API_MESSAGES.FORBIDDEN,
  code = 'forbidden',
): AppError {
  return new AppError({
    statusCode: 403,
    error: 'Forbidden',
    code,
    message,
  });
}

export function createConflictError(
  message: string,
  field?: string,
  code = 'conflict',
): AppError {
  return new AppError({
    statusCode: 409,
    error: 'Conflict',
    code,
    message,
    ...(field !== undefined ? { data: { field } } : {}),
  });
}

export function createRateLimitError(
  message: string = API_MESSAGES.RATE_LIMIT_EXCEEDED,
): AppError {
  return new AppError({
    statusCode: 429,
    error: 'Too Many Requests',
    code: 'rate_limit_exceeded',
    message,
  });
}

export function createCannotDeactivateSelfError(
  message: string = API_MESSAGES.CANNOT_DEACTIVATE_SELF,
): AppError {
  return new AppError({
    statusCode: 403,
    error: 'Forbidden',
    code: 'cannot_deactivate_self',
    message,
  });
}

export function createAccountHasActiveLoansError(
  message: string = API_MESSAGES.ACCOUNT_HAS_ACTIVE_LOANS,
): AppError {
  return new AppError({
    statusCode: 409,
    error: 'Conflict',
    code: 'account_has_active_loans',
    message,
  });
}

export function fromZodError(error: z.ZodError): AppError {
  const firstIssue = error.issues[0];
  const rawField = firstIssue?.path[0];
  const field = typeof rawField === 'string' ? rawField : undefined;
  const message = firstIssue?.message ?? API_MESSAGES.FIELD_REQUIRED;

  return createValidationError(message, field);
}
