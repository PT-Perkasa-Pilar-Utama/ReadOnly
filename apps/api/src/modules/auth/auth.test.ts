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
      async listUsers() {
        return { items: [], total: 0 };
      },
      async findUserById() {
        return null;
      },
      async createAdminUser() {
        return { status: 'email_conflict' };
      },
      async updateUser() {
        return null;
      },
      async hasActiveLoans() {
        return false;
      },
      async updateUserStatus() {
        return null;
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

describe('Management User Admin API (BE-S1-05 / US-12)', () => {
  async function getSessionCookie(
    app: ReturnType<typeof createApp>,
    email: string,
    password = 'password123',
  ): Promise<string> {
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    );
    const body = (await res.json()) as { data: { token: string } };
    return `readonly_session=${body.data.token}`;
  }

  it('enforces RBAC on all /admin/users endpoints (401 unauthenticated, 403 member)', async () => {
    const { app } = createTestHarness();
    const memberCookie = await getSessionCookie(
      app,
      'member1@readonly.ppu.co.id',
    );
    const targetUserId = QA_IDS.users.member1;

    const testEndpoints = [
      { method: 'GET', url: 'http://localhost/api/v1/admin/users', body: null },
      {
        method: 'GET',
        url: `http://localhost/api/v1/admin/users/${targetUserId}`,
        body: null,
      },
      {
        method: 'POST',
        url: 'http://localhost/api/v1/admin/users',
        body: {
          full_name: 'Test Admin',
          email: 'testadmin@readonly.ppu.co.id',
          phone_number: '081100009999',
          password: 'password123',
          confirm_password: 'password123',
        },
      },
      {
        method: 'PATCH',
        url: `http://localhost/api/v1/admin/users/${targetUserId}`,
        body: {
          full_name: 'Member Updated',
          phone_number: '081299998888',
          address: 'Jl. Baru No. 1',
        },
      },
      {
        method: 'PATCH',
        url: `http://localhost/api/v1/admin/users/${targetUserId}/status`,
        body: { status: 'inactive' },
      },
    ];

    for (const ep of testEndpoints) {
      const unauthInit: RequestInit = {
        method: ep.method,
      };
      if (ep.body) {
        unauthInit.headers = { 'content-type': 'application/json' };
        unauthInit.body = JSON.stringify(ep.body);
      }

      const unauthRes = await app.handle(new Request(ep.url, unauthInit));
      expect(unauthRes.status).toBe(401);
      const unauthJson = await unauthRes.json();
      expect(unauthJson.code).toBe('session_not_found');

      const memberInit: RequestInit = {
        method: ep.method,
        headers: {
          cookie: memberCookie,
          ...(ep.body ? { 'content-type': 'application/json' } : {}),
        },
      };
      if (ep.body) {
        memberInit.body = JSON.stringify(ep.body);
      }

      const memberRes = await app.handle(new Request(ep.url, memberInit));
      expect(memberRes.status).toBe(403);
      const memberJson = await memberRes.json();
      expect(memberJson.code).toBe('forbidden');
    }
  });

  it('GET /admin/users returns paginated users list without sensitive fields or addresses (AC-12.01)', async () => {
    const { app, authRepository } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');
    const totalUsers = authRepository.getUsers().length;

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/users?page=1&limit=2', {
        headers: { cookie: adminCookie },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / 2),
    });

    for (const user of body.data) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('full_name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('phone_number');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('status');
      expect(user).not.toHaveProperty('address');
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('passwordHash');
    }
  });

  it('GET /admin/users filters by role and searches by name or email (AC-12.11)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const adminOnlyRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users?role=admin', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(adminOnlyRes.status).toBe(200);
    const adminOnlyBody = await adminOnlyRes.json();
    expect(adminOnlyBody.data.length).toBeGreaterThanOrEqual(1);
    for (const user of adminOnlyBody.data) {
      expect(user.role).toBe('admin');
    }

    const memberOnlyRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users?role=member', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(memberOnlyRes.status).toBe(200);
    const memberOnlyBody = await memberOnlyRes.json();
    expect(memberOnlyBody.data.length).toBeGreaterThanOrEqual(1);
    for (const user of memberOnlyBody.data) {
      expect(user.role).toBe('member');
    }

    const searchByNameRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users?q=member satu', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(searchByNameRes.status).toBe(200);
    const searchByNameBody = await searchByNameRes.json();
    expect(searchByNameBody.data).toHaveLength(1);
    expect(searchByNameBody.data[0].full_name).toBe('Member Satu');

    const searchByEmailRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users?q=inactive@readonly', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(searchByEmailRes.status).toBe(200);
    const searchByEmailBody = await searchByEmailRes.json();
    expect(searchByEmailBody.data).toHaveLength(1);
    expect(searchByEmailBody.data[0].email).toBe('inactive@readonly.ppu.co.id');

    const emptyRes = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/users?q=tidakadauserini12345',
        {
          headers: { cookie: adminCookie },
        },
      ),
    );
    expect(emptyRes.status).toBe(200);
    const emptyBody = await emptyRes.json();
    expect(emptyBody.data).toEqual([]);
    expect(emptyBody.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it('GET /admin/users rejects invalid query parameters with 422 invalid_request', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const invalidLimitRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users?limit=99', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(invalidLimitRes.status).toBe(422);

    const invalidRoleRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users?role=guest', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(invalidRoleRes.status).toBe(422);
  });

  it('GET /admin/users/:id returns user detail with role-dependent address (AC-12.05)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const adminDetailRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/users/${QA_IDS.users.admin}`, {
        headers: { cookie: adminCookie },
      }),
    );
    expect(adminDetailRes.status).toBe(200);
    const adminDetailBody = await adminDetailRes.json();
    expect(adminDetailBody.data).toEqual({
      id: QA_IDS.users.admin,
      full_name: 'Admin Perpus',
      email: 'admin@readonly.ppu.co.id',
      phone_number: '081100000001',
      address: null,
      role: 'admin',
      status: 'active',
    });

    const memberDetailRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${QA_IDS.users.member1}`,
        {
          headers: { cookie: adminCookie },
        },
      ),
    );
    expect(memberDetailRes.status).toBe(200);
    const memberDetailBody = await memberDetailRes.json();
    expect(memberDetailBody.data).toEqual({
      id: QA_IDS.users.member1,
      full_name: 'Member Satu',
      email: 'member1@readonly.ppu.co.id',
      phone_number: '081200000001',
      address: 'Jl. Sudirman No. 1, Jakarta',
      role: 'member',
      status: 'active',
    });

    const notFoundRes = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/users/00000000-0000-4000-8000-000000000999',
        {
          headers: { cookie: adminCookie },
        },
      ),
    );
    expect(notFoundRes.status).toBe(404);
    expect(await notFoundRes.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      code: 'not_found',
      message: 'User tidak ditemukan.',
    });

    const invalidUuidRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users/bukan-uuid', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(invalidUuidRes.status).toBe(404);
  });

  it('POST /admin/users creates an Admin account and permits login (AC-12.02)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const createRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin Dua',
          email: 'admin2@readonly.ppu.co.id',
          phone_number: '081100000005',
          password: 'password123',
          confirm_password: 'password123',
        }),
      }),
    );

    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.message).toBe('Admin berhasil ditambahkan');
    expect(createBody.data).toMatchObject({
      full_name: 'Admin Dua',
      email: 'admin2@readonly.ppu.co.id',
      phone_number: '081100000005',
      role: 'admin',
      status: 'active',
    });

    const newAdminCookie = await getSessionCookie(
      app,
      'admin2@readonly.ppu.co.id',
      'password123',
    );
    const meRes = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: { cookie: newAdminCookie },
      }),
    );
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.data.role).toBe('admin');
  });

  it('POST /admin/users validates mandatory fields and formats (AC-12.03, AC-12.04)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const emptyFieldRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          full_name: '   ',
          email: 'admin.new@readonly.ppu.co.id',
          phone_number: '081100000006',
          password: 'password123',
          confirm_password: 'password123',
        }),
      }),
    );
    expect(emptyFieldRes.status).toBe(422);
    expect(await emptyFieldRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'full_name' },
    });

    const invalidEmailRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin New',
          email: 'format-salah',
          phone_number: '081100000006',
          password: 'password123',
          confirm_password: 'password123',
        }),
      }),
    );
    expect(invalidEmailRes.status).toBe(422);
    expect(await invalidEmailRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Format email salah',
      data: { field: 'email' },
    });

    const mismatchRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin New',
          email: 'admin.new@readonly.ppu.co.id',
          phone_number: '081100000006',
          password: 'password123',
          confirm_password: 'differentPassword',
        }),
      }),
    );
    expect(mismatchRes.status).toBe(422);
    expect(await mismatchRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Password harus sama',
      data: { field: 'confirm_password' },
    });

    const duplicateRes = await app.handle(
      new Request('http://localhost/api/v1/admin/users', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin New',
          email: 'admin@readonly.ppu.co.id',
          phone_number: '081100000006',
          password: 'password123',
          confirm_password: 'password123',
        }),
      }),
    );
    expect(duplicateRes.status).toBe(409);
    expect(await duplicateRes.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'conflict',
      message: 'Email sudah terdaftar',
      data: { field: 'email' },
    });
  });

  it('PATCH /admin/users/:id modifies Member data with address (AC-12.05)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const updateRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${QA_IDS.users.member1}`,
        {
          method: 'PATCH',
          headers: {
            cookie: adminCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            full_name: 'Member Satu Diperbarui',
            phone_number: '081299990001',
            address: 'Jl. Thamrin No. 99, Jakarta',
          }),
        },
      ),
    );

    expect(updateRes.status).toBe(200);
    const body = await updateRes.json();
    expect(body.message).toBe('Data user berhasil diubah');
    expect(body.data).toEqual({
      id: QA_IDS.users.member1,
      full_name: 'Member Satu Diperbarui',
      phone_number: '081299990001',
      address: 'Jl. Thamrin No. 99, Jakarta',
      role: 'member',
    });
  });

  it('PATCH /admin/users/:id modifies Admin data without address (AC-12.05)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const updateRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/users/${QA_IDS.users.admin}`, {
        method: 'PATCH',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin Utama',
          phone_number: '081199998888',
        }),
      }),
    );

    expect(updateRes.status).toBe(200);
    const body = await updateRes.json();
    expect(body.message).toBe('Data user berhasil diubah');
    expect(body.data).toEqual({
      id: QA_IDS.users.admin,
      full_name: 'Admin Utama',
      phone_number: '081199998888',
      address: null,
      role: 'admin',
    });
  });

  it('PATCH /admin/users/:id rejects extra/disallowed fields and missing fields (AC-12.03, AC-12.05)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const emailAttemptRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${QA_IDS.users.member1}`,
        {
          method: 'PATCH',
          headers: {
            cookie: adminCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            full_name: 'Member Baru',
            phone_number: '081299990001',
            address: 'Jl. Baru',
            email: 'gantiemail@gmail.com',
          }),
        },
      ),
    );
    expect(emailAttemptRes.status).toBe(422);

    const adminAddressAttemptRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/users/${QA_IDS.users.admin}`, {
        method: 'PATCH',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin Utama',
          phone_number: '081199998888',
          address: 'Alamat Admin',
        }),
      }),
    );
    expect(adminAddressAttemptRes.status).toBe(422);

    const emptyPhoneRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${QA_IDS.users.member1}`,
        {
          method: 'PATCH',
          headers: {
            cookie: adminCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            full_name: 'Member Baru',
            phone_number: '',
            address: 'Jl. Baru',
          }),
        },
      ),
    );
    expect(emptyPhoneRes.status).toBe(422);
    expect(await emptyPhoneRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'phone_number' },
    });
  });

  it('PATCH /admin/users/:id/status prevents self-deactivation (AC-12.09)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const res = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${QA_IDS.users.admin}/status`,
        {
          method: 'PATCH',
          headers: {
            cookie: adminCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'inactive' }),
        },
      ),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'cannot_deactivate_self',
      message: 'Admin tidak dapat menonaktifkan akunnya sendiri',
    });
  });

  it('PATCH /admin/users/:id/status prevents deactivating member with active loans (AC-12.10)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');

    const res = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${QA_IDS.users.member1}/status`,
        {
          method: 'PATCH',
          headers: {
            cookie: adminCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'inactive' }),
        },
      ),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'account_has_active_loans',
      message:
        'Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif',
    });
  });

  it('PATCH /admin/users/:id/status deactivates eligible user and blocks subsequent login (AC-12.06, AC-12.07)', async () => {
    const { app, authRepository } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');
    const eligibleUserId = '00000000-0000-4000-8000-000000000099';

    authRepository.clearLoans();

    const deactivateRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${eligibleUserId}/status`,
        {
          method: 'PATCH',
          headers: {
            cookie: adminCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'inactive' }),
        },
      ),
    );

    expect(deactivateRes.status).toBe(200);
    expect(await deactivateRes.json()).toEqual({
      data: {
        id: eligibleUserId,
        status: 'inactive',
      },
      message: 'Akun berhasil dinonaktifkan',
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
    expect(loginRes.status).toBe(403);
    expect(await loginRes.json()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'account_inactive',
      message: 'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.',
    });
  });

  it('PATCH /admin/users/:id/status reactivates user and allows login (AC-12.08)', async () => {
    const { app } = createTestHarness();
    const adminCookie = await getSessionCookie(app, 'admin@readonly.ppu.co.id');
    const inactiveUserId = QA_IDS.users.inactiveMember;

    const activateRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/users/${inactiveUserId}/status`,
        {
          method: 'PATCH',
          headers: {
            cookie: adminCookie,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'active' }),
        },
      ),
    );

    expect(activateRes.status).toBe(200);
    expect(await activateRes.json()).toEqual({
      data: {
        id: inactiveUserId,
        status: 'active',
      },
      message: 'Akun berhasil diaktifkan',
    });

    const loginRes = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'inactive@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.message).toBe('Login Berhasil');
  });

  it('delegates Management User queries in DrizzleAuthRepository to Drizzle db', async () => {
    let selectCallCount = 0;
    const fakeDb = {
      select() {
        selectCallCount++;
        return {
          from() {
            return {
              where() {
                return {
                  orderBy() {
                    return {
                      limit() {
                        return {
                          async offset() {
                            return [
                              {
                                id: QA_IDS.users.admin,
                                fullName: 'Admin Drizzle',
                                email: 'admin.drizzle@readonly.ppu.co.id',
                                phoneNumber: '081100000001',
                                role: 'admin',
                                status: 'active',
                              },
                            ];
                          },
                        };
                      },
                    };
                  },
                  async limit() {
                    return [
                      {
                        id: QA_IDS.users.admin,
                        fullName: 'Admin Drizzle',
                        email: 'admin.drizzle@readonly.ppu.co.id',
                        passwordHash: 'hash',
                        address: null,
                        phoneNumber: '081100000001',
                        role: 'admin',
                        status: 'active',
                        createdAt: new Date(),
                      },
                    ];
                  },
                };
              },
            };
          },
        };
      },
      update() {
        return {
          set() {
            return {
              where() {
                return {
                  async returning() {
                    return [
                      {
                        id: QA_IDS.users.admin,
                        fullName: 'Admin Drizzle Updated',
                        email: 'admin.drizzle@readonly.ppu.co.id',
                        passwordHash: 'hash',
                        address: null,
                        phoneNumber: '081100000002',
                        role: 'admin',
                        status: 'inactive',
                        createdAt: new Date(),
                      },
                    ];
                  },
                };
              },
            };
          },
        };
      },
      async transaction(fn: (tx: unknown) => unknown) {
        const tx = {
          select() {
            return {
              from() {
                return {
                  where() {
                    return {
                      async limit() {
                        return [];
                      },
                    };
                  },
                };
              },
            };
          },
          insert() {
            return {
              values() {
                return {
                  async returning() {
                    return [
                      {
                        id: '00000000-0000-4000-8000-000000000088',
                        fullName: 'Admin Tx',
                        email: 'admintx@readonly.ppu.co.id',
                        phoneNumber: '081100000088',
                        role: 'admin',
                        status: 'active',
                      },
                    ];
                  },
                };
              },
            };
          },
        };
        return fn(tx);
      },
    } as unknown as Database;

    const repo = new DrizzleAuthRepository(fakeDb);
    const user = await repo.findUserById(QA_IDS.users.admin);
    expect(user?.fullName).toBe('Admin Drizzle');

    const created = await repo.createAdminUser({
      fullName: 'Admin Tx',
      email: 'admintx@readonly.ppu.co.id',
      passwordHash: 'hash',
      phoneNumber: '081100000088',
      createdAt: new Date(),
    });
    expect(created.status).toBe('created');
    if (created.status === 'created') {
      expect(created.user.email).toBe('admintx@readonly.ppu.co.id');
    }

    const updated = await repo.updateUser(QA_IDS.users.admin, {
      fullName: 'Admin Drizzle Updated',
      phoneNumber: '081100000002',
    });
    expect(updated?.fullName).toBe('Admin Drizzle Updated');

    const updatedStatus = await repo.updateUserStatus(
      QA_IDS.users.admin,
      'inactive',
    );
    expect(updatedStatus?.status).toBe('inactive');
    expect(selectCallCount).toBeGreaterThan(0);
  });
});
