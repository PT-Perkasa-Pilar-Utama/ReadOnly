import { describe, expect, it } from 'bun:test';
import { type Database, QA_IDS, sha256Hex } from '@readonly/db';
import { API_MESSAGES, SESSION_DURATION_MS } from '@readonly/shared';
import { Elysia } from 'elysia';
import { createApp, requireAuth, requireRole } from '../../app';
import type { ClockPort } from '../../ports/clock';
import { InMemoryBooksRepository } from '../books/books.repository';
import { BooksService } from '../books/books.service';
import {
  type AuthRepository,
  type CreateMemberInput,
  type CreateMemberResult,
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

const validStep1Body = {
  full_name: 'Rina Permata',
  email: 'rina.permata@gmail.com',
  address: 'Jl. Gatot Subroto No. 12, Jakarta',
  phone_number: '081298765432',
  password: 'password123',
  confirm_password: 'password123',
};

function createTestHarness(options?: {
  registerRateLimitMax?: number;
  registerRateLimitWindowMs?: number;
  loginRateLimitMax?: number;
  loginRateLimitWindowMs?: number;
  authRepository?: AuthRepository;
}) {
  const clock = new FakeClock();
  const booksRepository = new InMemoryBooksRepository();
  const booksService = new BooksService(booksRepository);
  const defaultAuthRepository = new InMemoryAuthRepository(undefined, (ids) =>
    booksService.areAllGenresActive(ids),
  );
  const authRepository = options?.authRepository ?? defaultAuthRepository;
  const authService = new AuthService({
    repository: authRepository,
    genreProvider: booksService,
    clock,
    bcryptSaltRounds: 4,
  });

  const app = createApp({
    clock,
    booksRepository,
    booksService,
    authRepository,
    authService,
    bcryptSaltRounds: 4,
    ...(options?.registerRateLimitMax !== undefined
      ? { registerRateLimitMax: options.registerRateLimitMax }
      : {}),
    ...(options?.registerRateLimitWindowMs !== undefined
      ? { registerRateLimitWindowMs: options.registerRateLimitWindowMs }
      : {}),
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
    booksRepository,
  };
}

describe('auth module - POST /api/v1/auth/register/validate & POST /api/v1/auth/register', () => {
  it('validates step 1 registration and returns step 2 (AC-01.07)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(validStep1Body),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { step: 2 },
      message: API_MESSAGES.REGISTER_STEP1_VALID,
    });
  });

  it('rejects missing or blank mandatory fields in step 1 with 422 Field harus diisi! (AC-01.03)', async () => {
    const { app } = createTestHarness();
    const mandatoryFields = [
      'full_name',
      'email',
      'address',
      'phone_number',
      'password',
      'confirm_password',
    ] as const;

    for (const field of mandatoryFields) {
      const response = await app.handle(
        new Request('http://localhost/api/v1/auth/register/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...validStep1Body,
            [field]: '   ',
          }),
        }),
      );

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        statusCode: 422,
        error: 'Unprocessable Entity',
        code: 'invalid_request',
        message: 'Field harus diisi!',
        data: { field },
      });
    }
  });

  it('rejects mismatched password confirmation with 422 Password harus sama (AC-01.04)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          confirm_password: 'wrong-password',
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Password harus sama',
      data: { field: 'confirm_password' },
    });
  });

  it('rejects invalid email format such as newmember.com with 422 Format email salah (AC-01.05)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          email: 'newmember.com',
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Format email salah',
      data: { field: 'email' },
    });
  });

  it('rejects passwords shorter than 8 characters (Q-04)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          password: 'short',
          confirm_password: 'short',
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'password' },
    });
  });

  it('rejects already registered email in step 1 with 409 Email sudah terdaftar (AC-01.08)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          email: 'NewMember@gmail.com',
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'conflict',
      message: 'Email sudah terdaftar',
      data: { field: 'email' },
    });
  });

  it('rejects final registration without genres with 422 Pilih minimal 1 genre (AC-01.06)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          genres: [],
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Pilih minimal 1 genre',
      data: { field: 'genres' },
    });
  });

  it('rejects final registration when an inactive or unknown genre is selected (AC-01.06, AC-11.06)', async () => {
    const { app } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          genres: [QA_IDS.genres.fiksi, QA_IDS.genres.inactive],
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Pilih minimal 1 genre',
      data: { field: 'genres' },
    });
  });

  it('creates a new member account, hashes password with bcrypt, and saves user_genres (AC-01.02, SEC-01)', async () => {
    const { app, authRepository } = createTestHarness();

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          genres: [QA_IDS.genres.fiksi, QA_IDS.genres.teknologi],
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      data: { userId: string; role: string };
      message: string;
    };

    expect(body.message).toBe('Akun berhasil dibuat');
    expect(body.data.role).toBe('member');
    expect(typeof body.data.userId).toBe('string');

    const storedUser = authRepository
      .getUsers()
      .find((u) => u.id === body.data.userId);
    expect(storedUser).toBeDefined();
    expect(storedUser?.email).toBe('rina.permata@gmail.com');
    expect(storedUser?.status).toBe('active');
    expect(storedUser?.passwordHash).not.toBe(validStep1Body.password);
    expect(
      await Bun.password.verify(
        validStep1Body.password,
        storedUser?.passwordHash ?? '',
      ),
    ).toBe(true);

    const savedGenres = authRepository
      .getUserGenres()
      .filter((ug) => ug.userId === body.data.userId)
      .map((ug) => ug.genreId);
    expect(savedGenres).toEqual([QA_IDS.genres.fiksi, QA_IDS.genres.teknologi]);
  });

  it('returns 409 Email sudah terdaftar when a race condition occurs during final registration (AC-01.08)', async () => {
    const raceRepository: AuthRepository = {
      async existsByEmail(): Promise<boolean> {
        return false;
      },
      async createMemberWithGenres(
        _input: CreateMemberInput,
      ): Promise<CreateMemberResult> {
        return { status: 'email_conflict' };
      },
      async findUserByEmail() {
        return null;
      },
      async createSession() {},
      async findActiveSessionByTokenHash() {
        return null;
      },
      async deleteSessionByTokenHash() {
        return false;
      },
    };

    const { app } = createTestHarness({ authRepository: raceRepository });

    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validStep1Body,
          genres: [QA_IDS.genres.fiksi],
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'conflict',
      message: 'Email sudah terdaftar',
      data: { field: 'email' },
    });
  });

  it('enforces per-IP rate limiting on register endpoints and resets after window via ClockPort (SEC-06)', async () => {
    const { app, clock } = createTestHarness({
      registerRateLimitMax: 2,
      registerRateLimitWindowMs: 60_000,
    });

    const makeRequest = (ip = '10.0.0.15') =>
      app.handle(
        new Request('http://localhost/api/v1/auth/register/validate', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify(validStep1Body),
        }),
      );

    expect((await makeRequest()).status).toBe(200);
    expect((await makeRequest()).status).toBe(200);

    const rateLimitedResponse = await makeRequest();
    expect(rateLimitedResponse.status).toBe(429);
    expect(await rateLimitedResponse.json()).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      code: 'rate_limit_exceeded',
      message: API_MESSAGES.RATE_LIMIT_EXCEEDED,
    });

    expect((await makeRequest('10.0.0.99')).status).toBe(200);

    clock.advanceMs(60_001);
    expect((await makeRequest()).status).toBe(200);
  });

  it('maps PostgreSQL 23505 unique constraint violations in DrizzleAuthRepository to email_conflict', async () => {
    const fakeDb = {
      async transaction(): Promise<never> {
        const pgError = Object.assign(
          new Error('duplicate key value violates unique constraint'),
          { code: '23505' },
        );
        throw pgError;
      },
    } as unknown as Database;

    const repository = new DrizzleAuthRepository(fakeDb);
    const result = await repository.createMemberWithGenres({
      fullName: 'Rina Permata',
      email: 'rina.permata@gmail.com',
      passwordHash: '$2b$10$hash',
      address: 'Jl. Gatot Subroto No. 12',
      phoneNumber: '081298765432',
      genreIds: [QA_IDS.genres.fiksi],
      createdAt: new Date('2026-11-09T03:00:00.000Z'),
    });

    expect(result).toEqual({ status: 'email_conflict' });
  });
});

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
