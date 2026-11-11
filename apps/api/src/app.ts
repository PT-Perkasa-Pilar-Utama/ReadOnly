import { API_PREFIX } from '@readonly/config';
import type { Database } from '@readonly/db';
import { API_MESSAGES, type ApiErrorEnvelope } from '@readonly/shared';
import { Elysia } from 'elysia';
import {
  type AuthRepository,
  DrizzleAuthRepository,
  InMemoryAuthRepository,
} from './modules/auth/auth.repository';
import {
  createAuthRoutes,
  requireAuth,
  requireRole,
} from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import {
  type BooksRepository,
  DrizzleBooksRepository,
  InMemoryBooksRepository,
} from './modules/books/books.repository';
import { createBooksRoutes } from './modules/books/books.routes';
import { BooksService } from './modules/books/books.service';
import {
  DrizzleJobsRepository,
  InMemoryJobsRepository,
  type JobsRepository,
} from './modules/jobs/jobs.repository';
import { createJobsRoutes } from './modules/jobs/jobs.routes';
import { JobsService } from './modules/jobs/jobs.service';
import {
  DrizzleLoansRepository,
  InMemoryLoansRepository,
  type LoansRepository,
} from './modules/loans/loans.repository';
import { createLoansRoutes } from './modules/loans/loans.routes';
import { LoansService } from './modules/loans/loans.service';
import { createSystemRoutes, type HealthChecks } from './modules/system/health';
import { type ClockPort, SystemClock } from './ports/clock';
import {
  DiskStorageAdapter,
  MemoryStorageAdapter,
  type StoragePort,
} from './ports/storage';
import { AppError } from './shared/errors';
import { InMemoryRateLimiter, type RateLimiter } from './shared/rate-limit';

export { requireAuth, requireRole };

export interface AppOptions {
  database?: () => Promise<boolean>;
  storage?: () => Promise<boolean>;
  healthChecks?: HealthChecks;
  db?: Database;
  clock?: ClockPort;
  storagePort?: StoragePort;
  booksRepository?: BooksRepository;
  authRepository?: AuthRepository;
  booksService?: BooksService;
  authService?: AuthService;
  loansRepository?: LoansRepository;
  loansService?: LoansService;
  jobsRepository?: JobsRepository | undefined;
  jobsService?: JobsService | undefined;
  enableScheduler?: boolean | undefined;
  autoCatchUp?: boolean | undefined;
  registerRateLimiter?: RateLimiter;
  registerRateLimitMax?: number;
  registerRateLimitWindowMs?: number;
  loginRateLimiter?: RateLimiter;
  loginRateLimitMax?: number;
  loginRateLimitWindowMs?: number;
  qrRateLimiter?: RateLimiter;
  qrRateLimitMax?: number;
  qrRateLimitWindowMs?: number;
  bcryptSaltRounds?: number;
}

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
        message: API_MESSAGES.UNAUTHORIZED,
      };
    case 'FORBIDDEN':
    case 403:
      return {
        statusCode: 403,
        error: 'Forbidden',
        code: 'forbidden',
        message: API_MESSAGES.FORBIDDEN,
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
        message: API_MESSAGES.RATE_LIMIT_EXCEEDED,
      };
    default:
      return {
        statusCode: 500,
        error: 'Internal Server Error',
        code: 'internal_error',
        message: 'Internal server error',
      };
  }
}

function resolveHealthChecks(options?: AppOptions): HealthChecks | undefined {
  if (options?.healthChecks) {
    return options.healthChecks;
  }

  if (options?.database || options?.storage) {
    return {
      database: options.database ?? (async () => false),
      storage: options.storage ?? (async () => false),
    };
  }

  return undefined;
}

function resolveRegisterRateLimitMax(): number {
  const raw = process.env.REGISTER_RATE_LIMIT;
  if (raw !== undefined && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 20;
}

function resolveLoginRateLimitMax(): number {
  const raw = process.env.LOGIN_RATE_LIMIT;
  if (raw !== undefined && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 5;
}

function resolveQrRateLimitMax(): number {
  const raw = process.env.QR_RATE_LIMIT;
  if (raw !== undefined && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 60;
}

function resolveRateLimitWindowMs(): number {
  const raw = process.env.QR_RATE_LIMIT_WINDOW_MIN;
  if (raw !== undefined && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed * 60 * 1000;
    }
  }
  return 10 * 60 * 1000;
}

export function createApp(options?: AppOptions) {
  const clock = options?.clock ?? new SystemClock();
  const storagePort =
    options?.storagePort ??
    (options?.db ? new DiskStorageAdapter() : new MemoryStorageAdapter());
  const booksRepository =
    options?.booksRepository ??
    (options?.db
      ? new DrizzleBooksRepository(options.db)
      : new InMemoryBooksRepository());
  const booksService =
    options?.booksService ??
    new BooksService({
      repository: booksRepository,
      storage: storagePort,
      clock,
    });

  const authRepository =
    options?.authRepository ??
    (options?.db
      ? new DrizzleAuthRepository(options.db)
      : new InMemoryAuthRepository(undefined, (ids) =>
          booksService.areAllGenresActive(ids),
        ));

  const authService =
    options?.authService ??
    new AuthService({
      repository: authRepository,
      genreProvider: booksService,
      clock,
      ...(options?.bcryptSaltRounds !== undefined
        ? { bcryptSaltRounds: options.bcryptSaltRounds }
        : {}),
    });

  const registerRateLimiter =
    options?.registerRateLimiter ??
    new InMemoryRateLimiter({
      clock,
      maxAttempts:
        options?.registerRateLimitMax ?? resolveRegisterRateLimitMax(),
      windowMs:
        options?.registerRateLimitWindowMs ?? resolveRateLimitWindowMs(),
    });

  const loginRateLimiter =
    options?.loginRateLimiter ??
    new InMemoryRateLimiter({
      clock,
      maxAttempts: options?.loginRateLimitMax ?? resolveLoginRateLimitMax(),
      windowMs: options?.loginRateLimitWindowMs ?? resolveRateLimitWindowMs(),
    });

  const qrRateLimiter =
    options?.qrRateLimiter ??
    new InMemoryRateLimiter({
      clock,
      maxAttempts: options?.qrRateLimitMax ?? resolveQrRateLimitMax(),
      windowMs: options?.qrRateLimitWindowMs ?? resolveRateLimitWindowMs(),
    });

  const loansRepository =
    options?.loansRepository ??
    (options?.db
      ? new DrizzleLoansRepository(options.db)
      : new InMemoryLoansRepository());

  const loansService =
    options?.loansService ??
    new LoansService({
      repository: loansRepository,
      storage: storagePort,
      clock,
    });

  const jobsRepository =
    options?.jobsRepository ??
    (options?.db
      ? new DrizzleJobsRepository(options.db)
      : new InMemoryJobsRepository());

  const jobsService =
    options?.jobsService ??
    new JobsService({
      repository: jobsRepository,
      loansRepository,
      loansService,
      clock,
      ...(options?.autoCatchUp !== undefined
        ? { autoCatchUp: options.autoCatchUp }
        : {}),
    });

  if (options?.enableScheduler) {
    jobsService.startScheduler();
  }

  const healthChecks = resolveHealthChecks(options);

  return new Elysia({ prefix: API_PREFIX })
    .onError({ as: 'global' }, ({ code, error, set }) => {
      if (error instanceof AppError) {
        set.status = error.statusCode;
        return error.toEnvelope();
      }

      const details = getErrorDetails(code);
      set.status = details.statusCode;

      const response: ApiErrorEnvelope = details;
      return response;
    })
    .use(createSystemRoutes(healthChecks))
    .use(createBooksRoutes(booksService, authService))
    .use(createAuthRoutes(authService, registerRateLimiter, loginRateLimiter))
    .use(createLoansRoutes(loansService, authService, qrRateLimiter))
    .use(createJobsRoutes(jobsService, clock));
}
