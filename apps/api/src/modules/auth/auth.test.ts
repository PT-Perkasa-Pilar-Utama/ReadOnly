import { describe, expect, it } from 'bun:test';
import { type Database, QA_IDS } from '@readonly/db';
import { API_MESSAGES } from '@readonly/shared';
import { createApp } from '../../app';
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
  authRepository?: AuthRepository;
}) {
  const clock = new FakeClock();
  const booksRepository = new InMemoryBooksRepository();
  const booksService = new BooksService(booksRepository);
  const defaultAuthRepository = new InMemoryAuthRepository(undefined, (ids) =>
    booksService.areAllGenresActive(ids),
  );
  const authRepository = options?.authRepository ?? defaultAuthRepository;

  const app = createApp({
    clock,
    booksRepository,
    booksService,
    authRepository,
    bcryptSaltRounds: 4,
    ...(options?.registerRateLimitMax !== undefined
      ? { registerRateLimitMax: options.registerRateLimitMax }
      : {}),
    ...(options?.registerRateLimitWindowMs !== undefined
      ? { registerRateLimitWindowMs: options.registerRateLimitWindowMs }
      : {}),
  });

  return {
    app,
    clock,
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
