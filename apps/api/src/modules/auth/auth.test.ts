import { describe, expect, it } from 'bun:test';
import { type Database, QA_IDS, sha256Hex } from '@readonly/db';
import { API_MESSAGES, SESSION_DURATION_MS } from '@readonly/shared';
import { Elysia } from 'elysia';
import { createApp, requireAuth, requireRole } from '../../app';
import type { ClockPort } from '../../ports/clock';
import {
  type AuthRepository,
  DrizzleAuthRepository,
  InMemoryAuthRepository,
} from './auth.repository';
import { AuthService } from './auth.service';

class FakeClock implements ClockPort {
  private current: Date;

  constructor(initialIso = '2026-11-09T03:00:00.000Z') {
    this.current = new Date(initialIso);
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  utcNow(): Date {
    return new Date(this.current.getTime());
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

function createTestHarness(options?: {
  loginRateLimitMax?: number;
  loginRateLimitWindowMs?: number;
  authRepository?: AuthRepository;
}) {
  const clock = new FakeClock();
  const defaultAuthRepository = new InMemoryAuthRepository();
  const authRepository = options?.authRepository ?? defaultAuthRepository;
  const authService = new AuthService({
    repository: authRepository,
    clock,
    bcryptSaltRounds: 4,
  });

  const app = createApp({
    clock,
    authRepository,
    authService,
    ...(options?.loginRateLimitMax !== undefined
      ? { loginRateLimitMax: options.loginRateLimitMax }
      : {}),
    ...(options?.loginRateLimitWindowMs !== undefined
      ? { loginRateLimitWindowMs: options.loginRateLimitWindowMs }
      : {}),
  });

  return {
    app,
    clock,
    authService,
    authRepository: defaultAuthRepository,
  };
}

describe('auth API (BE-S1-02)', () => {
  it('authenticates active member, sets HttpOnly Secure SameSite=Lax cookie, and stores only token_hash (AC-02.01, SEC-03)', async () => {
    const { app, authRepository } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'NewMember@gmail.com',
          password: 'password',
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { token: string };
      message: string;
    };

    expect(body.message).toBe('Login Berhasil');
    expect(typeof body.data.token).toBe('string');
    expect(body.data.token.length).toBeGreaterThanOrEqual(32);

    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`readonly_session=${body.data.token}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');

    const sessions = authRepository.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.tokenHash).toBe(sha256Hex(body.data.token));
    expect(sessions[0]?.tokenHash).not.toBe(body.data.token);
  });

  it('authenticates Admin Perpus and returns admin profile on GET /auth/me (AC-02.05)', async () => {
    const { app } = createTestHarness();

    const loginResponse = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );

    expect(loginResponse.status).toBe(200);
    const loginBody = (await loginResponse.json()) as {
      data: { token: string };
      message: string;
    };
    expect(loginBody.message).toBe('Login Berhasil');

    const cookieHeader = loginResponse.headers.get('set-cookie') ?? '';

    const meResponse = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: { cookie: cookieHeader },
      }),
    );

    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toEqual({
      data: {
        id: QA_IDS.users.admin,
        full_name: 'Admin Perpus',
        role: 'admin',
        email: 'admin@readonly.ppu.co.id',
      },
    });
  });

  it('rejects wrong password with 422 email and Password tidak sama (AC-02.02)', async () => {
    const { app, authRepository } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'newmember@gmail.com',
          password: 'wrong-password',
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_credentials',
      message: 'email and Password tidak sama',
    });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(authRepository.getSessions()).toHaveLength(0);
  });

  it('rejects unregistered email with 422 Email Not Registered (AC-02.03)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'gabriel@gmail.com',
          password: 'password',
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'user_not_found',
      message: 'Email Not Registered',
    });
  });

  it('rejects empty email and empty password with verbatim AC-02.04 messages', async () => {
    const { app } = createTestHarness();

    const emptyEmailRes = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: '',
          password: 'password',
        }),
      }),
    );

    expect(emptyEmailRes.status).toBe(422);
    expect(await emptyEmailRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'email tidak boleh kosong',
      data: { field: 'email' },
    });

    const emptyPasswordRes = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'newmember@gmail.com',
          password: '',
        }),
      }),
    );

    expect(emptyPasswordRes.status).toBe(422);
    expect(await emptyPasswordRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Password tidak boleh kosong',
      data: { field: 'password' },
    });
  });

  it('rejects inactive user with 403 account_inactive and verbatim AC-12.07 message', async () => {
    const { app, authRepository } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'inactive@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'account_inactive',
      message: 'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.',
    });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(authRepository.getSessions()).toHaveLength(0);
  });

  it('returns member profile on GET /auth/me with email preserved for header display (AC-02.01)', async () => {
    const { app } = createTestHarness();

    const loginRes = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'newmember@gmail.com',
          password: 'password',
        }),
      }),
    );

    const { data } = (await loginRes.json()) as { data: { token: string } };

    const meRes = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: {
          cookie: `readonly_session=${data.token}`,
        },
      }),
    );

    expect(meRes.status).toBe(200);
    expect(await meRes.json()).toEqual({
      data: {
        id: '00000000-0000-4000-8000-000000000099',
        full_name: 'Member Baru',
        role: 'member',
        email: 'newmember@gmail.com',
      },
    });
  });

  it('rejects GET /auth/me with 401 session_not_found when unauthenticated or when session expires', async () => {
    const { app, clock } = createTestHarness();

    const unauthRes = await app.handle(
      new Request('http://localhost/api/v1/auth/me'),
    );
    expect(unauthRes.status).toBe(401);
    expect(await unauthRes.json()).toEqual({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'session_not_found',
      message: 'Silahkan login',
    });

    const loginRes = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'newmember@gmail.com',
          password: 'password',
        }),
      }),
    );
    const { data } = (await loginRes.json()) as { data: { token: string } };

    clock.advanceMs(SESSION_DURATION_MS + 1000);

    const expiredRes = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: {
          cookie: `readonly_session=${data.token}`,
        },
      }),
    );
    expect(expiredRes.status).toBe(401);
    expect(await expiredRes.json()).toEqual({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'session_not_found',
      message: 'Silahkan login',
    });
  });

  it('deletes session server-side on POST /auth/logout and returns 204 (AC-03.01, SEC-03)', async () => {
    const { app, authRepository } = createTestHarness();

    const loginRes = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'newmember@gmail.com',
          password: 'password',
        }),
      }),
    );
    const { data } = (await loginRes.json()) as { data: { token: string } };
    expect(authRepository.getSessions()).toHaveLength(1);

    const logoutRes = await app.handle(
      new Request('http://localhost/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `readonly_session=${data.token}`,
        },
      }),
    );

    expect(logoutRes.status).toBe(204);
    expect(await logoutRes.text()).toBe('');
    expect(logoutRes.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(authRepository.getSessions()).toHaveLength(0);

    const meAfterLogout = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: {
          cookie: `readonly_session=${data.token}`,
        },
      }),
    );
    expect(meAfterLogout.status).toBe(401);
    expect(await meAfterLogout.json()).toEqual({
      statusCode: 401,
      error: 'Unauthorized',
      code: 'session_not_found',
      message: 'Silahkan login',
    });

    const repeatLogout = await app.handle(
      new Request('http://localhost/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `readonly_session=${data.token}`,
        },
      }),
    );
    expect(repeatLogout.status).toBe(401);
  });

  it('enforces login rate limiting per IP+email and resets after window or successful login (SEC-06)', async () => {
    const { app, clock } = createTestHarness({
      loginRateLimitMax: 2,
      loginRateLimitWindowMs: 60_000,
    });

    const attemptLogin = (password: string, ip = '10.0.0.25') =>
      app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({
            email: 'newmember@gmail.com',
            password,
          }),
        }),
      );

    expect((await attemptLogin('wrong-1')).status).toBe(422);
    expect((await attemptLogin('wrong-2')).status).toBe(422);

    const blockedResponse = await attemptLogin('password');
    expect(blockedResponse.status).toBe(429);
    expect(await blockedResponse.json()).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      code: 'rate_limit_exceeded',
      message: API_MESSAGES.RATE_LIMIT_EXCEEDED,
    });

    expect((await attemptLogin('password', '10.0.0.99')).status).toBe(200);

    clock.advanceMs(60_001);
    expect((await attemptLogin('password')).status).toBe(200);
  });

  it('enforces requireAuth and requireRole RBAC middleware on protected routes (SEC-02)', async () => {
    const { app, authService } = createTestHarness();

    const protectedApp = new Elysia()
      .use(app)
      .get(
        '/api/v1/test-protected',
        () => ({ data: { access: 'authenticated' } }),
        { beforeHandle: requireAuth(authService) },
      )
      .get('/api/v1/test-admin', () => ({ data: { access: 'admin-only' } }), {
        beforeHandle: requireRole('admin', authService),
      });

    const unauthRes = await protectedApp.handle(
      new Request('http://localhost/api/v1/test-protected'),
    );
    expect(unauthRes.status).toBe(401);

    const memberLoginRes = await protectedApp.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'newmember@gmail.com',
          password: 'password',
        }),
      }),
    );
    const memberToken = (
      (await memberLoginRes.json()) as { data: { token: string } }
    ).data.token;

    const memberProtectedRes = await protectedApp.handle(
      new Request('http://localhost/api/v1/test-protected', {
        headers: { cookie: `readonly_session=${memberToken}` },
      }),
    );
    expect(memberProtectedRes.status).toBe(200);

    const memberAdminRes = await protectedApp.handle(
      new Request('http://localhost/api/v1/test-admin', {
        headers: { cookie: `readonly_session=${memberToken}` },
      }),
    );
    expect(memberAdminRes.status).toBe(403);
    expect(await memberAdminRes.json()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'forbidden',
      message: 'Akses ditolak.',
    });

    const adminLoginRes = await protectedApp.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );
    const adminToken = (
      (await adminLoginRes.json()) as { data: { token: string } }
    ).data.token;

    const adminRes = await protectedApp.handle(
      new Request('http://localhost/api/v1/test-admin', {
        headers: { authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(adminRes.status).toBe(200);
    expect(await adminRes.json()).toEqual({
      data: { access: 'admin-only' },
    });
  });

  it('delegates session and user queries in DrizzleAuthRepository to Drizzle db', async () => {
    const insertedSessions: unknown[] = [];
    const fakeDb = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  async limit() {
                    return [
                      {
                        id: QA_IDS.users.member1,
                        fullName: 'Member Satu',
                        email: 'member1@readonly.ppu.co.id',
                        passwordHash: '$2b$04$hash',
                        role: 'member',
                        status: 'active',
                      },
                    ];
                  },
                };
              },
              innerJoin() {
                return {
                  where() {
                    return {
                      async limit() {
                        return [
                          {
                            id: QA_IDS.users.member1,
                            fullName: 'Member Satu',
                            email: 'member1@readonly.ppu.co.id',
                            role: 'member',
                            status: 'active',
                          },
                        ];
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
      insert() {
        return {
          async values(val: unknown) {
            insertedSessions.push(val);
          },
        };
      },
      delete() {
        return {
          where() {
            return {
              async returning() {
                return [{ id: '00000000-0000-4000-8000-000000000010' }];
              },
            };
          },
        };
      },
    } as unknown as Database;

    const repo = new DrizzleAuthRepository(fakeDb);
    const user = await repo.findUserByEmail('Member1@readonly.ppu.co.id');
    expect(user?.id).toBe(QA_IDS.users.member1);

    const now = new Date('2026-11-09T03:00:00.000Z');
    await repo.createSession({
      userId: QA_IDS.users.member1,
      tokenHash: 'hash-1',
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
    });
    expect(insertedSessions).toHaveLength(1);

    const activeUser = await repo.findActiveSessionByTokenHash('hash-1', now);
    expect(activeUser?.email).toBe('member1@readonly.ppu.co.id');

    const deleted = await repo.deleteSessionByTokenHash('hash-1');
    expect(deleted).toBe(true);
  });
});
