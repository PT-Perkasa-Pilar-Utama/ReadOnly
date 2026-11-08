import { API_PREFIX } from '@readonly/config';
import type { ApiErrorEnvelope } from '@readonly/shared';
import { Elysia } from 'elysia';
import { createSystemRoutes, type HealthChecks } from './modules/system/health';

interface ErrorDetails {
  statusCode: number;
  error: string;
  code: string;
  message: string;
}

function getErrorDetails(code: string | number): ErrorDetails {
  switch (code) {
    case 'NOT_FOUND':
    case 404:
      return {
        statusCode: 404,
        error: 'Not Found',
        code: 'not_found',
        message: 'Resource tidak ditemukan.',
      };
    case 'UNAUTHORIZED':
    case 401:
      return {
        statusCode: 401,
        error: 'Unauthorized',
        code: 'unauthorized',
        message: 'Silahkan login',
      };
    case 'FORBIDDEN':
    case 403:
      return {
        statusCode: 403,
        error: 'Forbidden',
        code: 'forbidden',
        message: 'Akses ditolak.',
      };
    case 'CONFLICT':
    case 409:
      return {
        statusCode: 409,
        error: 'Conflict',
        code: 'conflict',
        message: 'Konflik data.',
      };
    case 'VALIDATION':
    case 422:
      return {
        statusCode: 422,
        error: 'Unprocessable Entity',
        code: 'invalid_request',
        message: 'Permintaan tidak valid.',
      };
    case 'PARSE':
    case 400:
      return {
        statusCode: 400,
        error: 'Bad Request',
        code: 'invalid_request',
        message: 'Permintaan tidak valid.',
      };
    case 'TOO_MANY_REQUESTS':
    case 429:
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        code: 'rate_limit_exceeded',
        message: 'Terlalu banyak permintaan.',
      };
    default:
      return {
        statusCode: 500,
        error: 'Internal Server Error',
        code: 'internal_error',
        message: 'Terjadi kesalahan internal.',
      };
  }
}

export function createApp(healthChecks?: HealthChecks) {
  return new Elysia({ prefix: API_PREFIX })
    .onError(({ code, set }) => {
      const details = getErrorDetails(code);
      set.status = details.statusCode;

      const response: ApiErrorEnvelope = details;
      return response;
    })
    .use(createSystemRoutes(healthChecks));
}
