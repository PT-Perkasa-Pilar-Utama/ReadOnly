import { z } from 'zod';
import { USER_ROLES, type UserRole } from './constants';

export const MAX_TEXT_FIELD_LENGTH = 255;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SESSION_COOKIE_NAME = 'readonly_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_DURATION_MS = SESSION_MAX_AGE_SECONDS * 1000;

// Verbatim message catalog strings per docs/api-specs/01-conventions.md.
export const API_MESSAGES = {
  FIELD_REQUIRED: 'Field harus diisi!',
  EMAIL_REQUIRED: 'email tidak boleh kosong',
  PASSWORD_REQUIRED: 'Password tidak boleh kosong',
  INVALID_CREDENTIALS: 'email and Password tidak sama',
  USER_NOT_FOUND: 'Email Not Registered',
  ACCOUNT_INACTIVE: 'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.',
  LOGIN_SUCCESS: 'Login Berhasil',
  UNAUTHORIZED: 'Silahkan login', // [ASSUMED Q-04]
  FORBIDDEN: 'Akses ditolak.',
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak percobaan login', // [COPY-TBD Q-04]
} as const;

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponseData {
  token: string;
}

export interface AuthMeResponseData {
  id: string;
  full_name: string;
  role: UserRole;
  email: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const loginSchema = z.unknown().transform((input, ctx): LoginInput => {
  if (!isRecord(input)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: API_MESSAGES.EMAIL_REQUIRED,
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: API_MESSAGES.PASSWORD_REQUIRED,
    });
    return z.NEVER;
  }

  const rawEmail = input.email;
  const rawPassword = input.password;

  const emailEmpty =
    typeof rawEmail !== 'string' ||
    rawEmail.trim().length === 0 ||
    rawEmail.trim().length > MAX_TEXT_FIELD_LENGTH;
  const passwordEmpty =
    typeof rawPassword !== 'string' ||
    rawPassword.trim().length === 0 ||
    rawPassword.length > MAX_TEXT_FIELD_LENGTH;

  if (emailEmpty) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: API_MESSAGES.EMAIL_REQUIRED,
    });
  }

  if (passwordEmpty) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: API_MESSAGES.PASSWORD_REQUIRED,
    });
  }

  if (emailEmpty || passwordEmpty) {
    return z.NEVER;
  }

  return {
    email: (rawEmail as string).trim().toLowerCase(),
    password: rawPassword as string,
  };
});

export const authMeResponseDataSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  full_name: z.string().min(1),
  role: z.enum(USER_ROLES),
  email: z.string().min(1),
});
