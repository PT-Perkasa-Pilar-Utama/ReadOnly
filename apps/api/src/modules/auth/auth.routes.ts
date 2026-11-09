import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type UserRole,
} from '@readonly/shared';
import { Elysia } from 'elysia';
import {
  createForbiddenError,
  createRateLimitError,
} from '../../shared/errors';
import { extractClientIp, type RateLimiter } from '../../shared/rate-limit';
import type { AuthenticatedUser } from './auth.repository';
import type { AuthenticatedSession, AuthService } from './auth.service';

export function extractSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const name = pair.slice(0, separatorIndex).trim();
      if (name !== SESSION_COOKIE_NAME) {
        continue;
      }

      const rawValue = pair.slice(separatorIndex + 1).trim();
      if (rawValue.length === 0) {
        return null;
      }

      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    return bearerToken.length > 0 ? bearerToken : null;
  }

  return null;
}

export function buildSessionCookie(
  token: string,
  secure = process.env.COOKIE_SECURE !== 'false',
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    ...(secure ? ['Secure'] : []),
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  return parts.join('; ');
}

export function buildClearSessionCookie(
  secure = process.env.COOKIE_SECURE !== 'false',
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    ...(secure ? ['Secure'] : []),
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
  ];
  return parts.join('; ');
}

export function requireAuth(
  authService: AuthService,
): ({ request }: { request: Request }) => Promise<void>;
export function requireAuth(
  request: Request,
  authService: AuthService,
): Promise<AuthenticatedSession>;
export function requireAuth(
  first: AuthService | Request,
  second?: AuthService,
):
  | (({ request }: { request: Request }) => Promise<void>)
  | Promise<AuthenticatedSession> {
  if (first instanceof Request) {
    if (!second) {
      throw new Error('AuthService is required when calling requireAuth.');
    }
    const token = extractSessionToken(first);
    return second.authenticateToken(token);
  }

  const service = first;
  return async ({ request }: { request: Request }) => {
    const token = extractSessionToken(request);
    await service.authenticateToken(token);
  };
}

function normalizeAllowedRoles(
  roles: UserRole | readonly UserRole[],
): readonly UserRole[] {
  return typeof roles === 'string' ? [roles] : roles;
}

export function assertUserRole(
  user: AuthenticatedUser,
  roles: UserRole | readonly UserRole[],
): AuthenticatedUser {
  const allowed = normalizeAllowedRoles(roles);
  if (!allowed.includes(user.role)) {
    throw createForbiddenError();
  }
  return user;
}

export function requireRole(
  roles: UserRole | readonly UserRole[],
  authService: AuthService,
): ({ request }: { request: Request }) => Promise<void>;
export function requireRole(
  user: AuthenticatedUser,
  roles: UserRole | readonly UserRole[],
): AuthenticatedUser;
export function requireRole(
  request: Request,
  authService: AuthService,
  roles: UserRole | readonly UserRole[],
): Promise<AuthenticatedSession>;
export function requireRole(
  first: UserRole | readonly UserRole[] | AuthenticatedUser | Request,
  second: AuthService | UserRole | readonly UserRole[],
  third?: UserRole | readonly UserRole[],
):
  | (({ request }: { request: Request }) => Promise<void>)
  | AuthenticatedUser
  | Promise<AuthenticatedSession> {
  if (first instanceof Request) {
    const service = second as AuthService;
    const roles = third as UserRole | readonly UserRole[];
    return (async () => {
      const session = await requireAuth(first, service);
      assertUserRole(session.user, roles);
      return session;
    })();
  }

  if (
    typeof first === 'object' &&
    first !== null &&
    !Array.isArray(first) &&
    'role' in first
  ) {
    return assertUserRole(
      first as AuthenticatedUser,
      second as UserRole | readonly UserRole[],
    );
  }

  const roles = first as UserRole | readonly UserRole[];
  const service = second as AuthService;
  return async ({ request }: { request: Request }) => {
    const session = await requireAuth(request, service);
    assertUserRole(session.user, roles);
  };
}

function extractNormalizedEmailFromBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  const rawEmail = (body as Record<string, unknown>).email;
  if (typeof rawEmail !== 'string') {
    return null;
  }

  const trimmed = rawEmail.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function createAuthRoutes(
  authService: AuthService,
  registerRateLimiter: RateLimiter,
  loginRateLimiter: RateLimiter,
) {
  return new Elysia({ prefix: '/auth' })
    .post('/register/validate', async ({ body, request }) => {
      const clientIp = extractClientIp(request);
      if (!registerRateLimiter.consume(`register:${clientIp}`)) {
        throw createRateLimitError();
      }

      return authService.validateRegistrationStep1(body);
    })
    .post('/register', async ({ body, request, set }) => {
      const clientIp = extractClientIp(request);
      if (!registerRateLimiter.consume(`register:${clientIp}`)) {
        throw createRateLimitError();
      }

      const result = await authService.registerMember(body);
      set.status = 201;
      return result;
    })
    .post('/login', async ({ body, request, set }) => {
      const clientIp = extractClientIp(request);
      const ipKey = `login:ip:${clientIp}`;
      const normalizedEmail = extractNormalizedEmailFromBody(body);
      const ipEmailKey = normalizedEmail
        ? `login:ip-email:${clientIp}:${normalizedEmail}`
        : null;

      const ipAllowed = loginRateLimiter.consume(ipKey);
      const emailAllowed = ipEmailKey
        ? loginRateLimiter.consume(ipEmailKey)
        : true;

      if (!ipAllowed || !emailAllowed) {
        throw createRateLimitError();
      }

      const result = await authService.login(body);

      loginRateLimiter.reset(ipKey);
      if (ipEmailKey) {
        loginRateLimiter.reset(ipEmailKey);
      }

      set.headers['set-cookie'] = buildSessionCookie(result.sessionToken);
      return result.envelope;
    })
    .get('/me', async ({ request }) => {
      const session = await requireAuth(request, authService);
      return authService.getMe(session.user);
    })
    .post('/logout', async ({ request, set }) => {
      const session = await requireAuth(request, authService);
      await authService.logout(session.tokenHash);
      set.headers['set-cookie'] = buildClearSessionCookie();
      set.status = 204;
      return null;
    });
}
