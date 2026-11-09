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

export function fromZodError(error: z.ZodError): AppError {
  const firstIssue = error.issues[0];
  const rawField = firstIssue?.path[0];
  const field = typeof rawField === 'string' ? rawField : undefined;
  const message = firstIssue?.message ?? API_MESSAGES.FIELD_REQUIRED;

  return createValidationError(message, field);
}

