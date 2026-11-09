import { z } from 'zod';
import type { UserRole } from './constants';

export const PASSWORD_MIN_LENGTH = 8;
export const MAX_TEXT_FIELD_LENGTH = 255;
export const MAX_ADDRESS_LENGTH = 1000;
export const MAX_PHONE_NUMBER_LENGTH = 50;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL_CHECK_SCHEMA = z.string().email();

// String katalog pesan mengikuti docs/api-specs/01-conventions.md secara verbatim.
export const API_MESSAGES = {
  FIELD_REQUIRED: 'Field harus diisi!',
  PASSWORD_MISMATCH: 'Password harus sama',
  INVALID_EMAIL_FORMAT: 'Format email salah',
  GENRE_REQUIRED: 'Pilih minimal 1 genre',
  EMAIL_ALREADY_REGISTERED: 'Email sudah terdaftar',
  REGISTER_STEP1_VALID: 'Data valid', // [COPY-TBD Q-05]
  REGISTER_SUCCESS: 'Akun berhasil dibuat',
  RATE_LIMIT_EXCEEDED: 'Terlalu banyak percobaan login', // [COPY-TBD Q-04]
} as const;

export const genreItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  name: z.string().trim().min(1),
});

export type GenreItem = z.infer<typeof genreItemSchema>;

export interface RegisterValidateInput {
  full_name: string;
  email: string;
  address: string;
  phone_number: string;
  password: string;
  confirm_password: string;
}

export interface RegisterInput extends RegisterValidateInput {
  genres: string[];
}

export interface RegisterValidateResponseData {
  step: 2;
}

export interface RegisterResponseData {
  userId: string;
  role: Extract<UserRole, 'member'>;
}

const STEP1_REQUIRED_FIELDS = [
  'full_name',
  'email',
  'address',
  'phone_number',
  'password',
  'confirm_password',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateStep1Fields(
  raw: Record<string, unknown>,
  ctx: z.RefinementCtx,
): RegisterValidateInput | null {
  for (const field of STEP1_REQUIRED_FIELDS) {
    const value = raw[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: API_MESSAGES.FIELD_REQUIRED,
      });
      return null;
    }
  }

  const fullName = (raw.full_name as string).trim();
  const email = (raw.email as string).trim().toLowerCase();
  const address = (raw.address as string).trim();
  const phoneNumber = (raw.phone_number as string).trim();
  const password = raw.password as string;
  const confirmPassword = raw.confirm_password as string;

  if (fullName.length > MAX_TEXT_FIELD_LENGTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['full_name'],
      message: API_MESSAGES.FIELD_REQUIRED,
    });
    return null;
  }

  if (
    email.length > MAX_TEXT_FIELD_LENGTH ||
    !EMAIL_CHECK_SCHEMA.safeParse(email).success
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: API_MESSAGES.INVALID_EMAIL_FORMAT,
    });
    return null;
  }

  if (address.length > MAX_ADDRESS_LENGTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['address'],
      message: API_MESSAGES.FIELD_REQUIRED,
    });
    return null;
  }

  if (phoneNumber.length > MAX_PHONE_NUMBER_LENGTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone_number'],
      message: API_MESSAGES.FIELD_REQUIRED,
    });
    return null;
  }

  if (password !== confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirm_password'],
      message: API_MESSAGES.PASSWORD_MISMATCH,
    });
    return null;
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > MAX_TEXT_FIELD_LENGTH
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: API_MESSAGES.FIELD_REQUIRED,
    });
    return null;
  }

  return {
    full_name: fullName,
    email,
    address,
    phone_number: phoneNumber,
    password,
    confirm_password: confirmPassword,
  };
}

export const registerValidateSchema = z
  .unknown()
  .transform((input, ctx): RegisterValidateInput => {
    if (!isRecord(input)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['full_name'],
        message: API_MESSAGES.FIELD_REQUIRED,
      });
      return z.NEVER;
    }

    const validated = validateStep1Fields(input, ctx);
    if (!validated) {
      return z.NEVER;
    }

    return validated;
  });

export const registerSchema = z
  .unknown()
  .transform((input, ctx): RegisterInput => {
    if (!isRecord(input)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['full_name'],
        message: API_MESSAGES.FIELD_REQUIRED,
      });
      return z.NEVER;
    }

    const keys = Object.keys(input);
    if (keys.length === 1 && keys[0] === 'genres') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['genres'],
        message: API_MESSAGES.GENRE_REQUIRED,
      });
      return z.NEVER;
    }

    const step1 = validateStep1Fields(input, ctx);
    if (!step1) {
      return z.NEVER;
    }

    if (!Array.isArray(input.genres)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['genres'],
        message: API_MESSAGES.GENRE_REQUIRED,
      });
      return z.NEVER;
    }

    const normalizedGenres: string[] = [];
    const seen = new Set<string>();

    for (const item of input.genres) {
      if (typeof item !== 'string' || item.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['genres'],
          message: API_MESSAGES.GENRE_REQUIRED,
        });
        return z.NEVER;
      }

      const trimmed = item.trim().toLowerCase();
      if (!UUID_REGEX.test(trimmed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['genres'],
          message: API_MESSAGES.GENRE_REQUIRED,
        });
        return z.NEVER;
      }

      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        normalizedGenres.push(trimmed);
      }
    }

    if (normalizedGenres.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['genres'],
        message: API_MESSAGES.GENRE_REQUIRED,
      });
      return z.NEVER;
    }

    return {
      ...step1,
      genres: normalizedGenres,
    };
  });
