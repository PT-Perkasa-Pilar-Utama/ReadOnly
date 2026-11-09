import { describe, expect, it } from 'bun:test';
import {
  API_MESSAGES,
  genreItemSchema,
  registerSchema,
  registerValidateSchema,
} from './auth';

const validStep1Payload = {
  full_name: 'Budi Santoso',
  email: 'Budi.Santoso@Gmail.com',
  address: 'Jl. Sudirman No. 10, Jakarta',
  phone_number: '081234567890',
  password: 'password123',
  confirm_password: 'password123',
};

const validGenreId = '00000000-0000-4000-8001-000000000001';

describe('shared auth and genre schemas', () => {
  it('validates and normalizes step 1 registration payload', () => {
    const parsed = registerValidateSchema.safeParse(validStep1Payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe('budi.santoso@gmail.com');
      expect(parsed.data.full_name).toBe('Budi Santoso');
    }
  });

  it('rejects empty mandatory fields with verbatim AC-01.03 message', () => {
    const parsed = registerValidateSchema.safeParse({
      ...validStep1Payload,
      address: '   ',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(API_MESSAGES.FIELD_REQUIRED);
      expect(parsed.error.issues[0]?.path).toEqual(['address']);
    }
  });

  it('rejects invalid email format with verbatim AC-01.05 message', () => {
    const parsed = registerValidateSchema.safeParse({
      ...validStep1Payload,
      email: 'newmember.com',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        API_MESSAGES.INVALID_EMAIL_FORMAT,
      );
      expect(parsed.error.issues[0]?.path).toEqual(['email']);
    }
  });

  it('rejects mismatched password confirmation with verbatim AC-01.04 message', () => {
    const parsed = registerValidateSchema.safeParse({
      ...validStep1Payload,
      confirm_password: 'differentPassword',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        API_MESSAGES.PASSWORD_MISMATCH,
      );
      expect(parsed.error.issues[0]?.path).toEqual(['confirm_password']);
    }
  });

  it('rejects empty genres on final registration with verbatim AC-01.06 message', () => {
    const parsed = registerSchema.safeParse({
      ...validStep1Payload,
      genres: [],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(API_MESSAGES.GENRE_REQUIRED);
      expect(parsed.error.issues[0]?.path).toEqual(['genres']);
    }
  });

  it('deduplicates and normalizes valid genre UUIDs on final registration', () => {
    const parsed = registerSchema.safeParse({
      ...validStep1Payload,
      genres: [validGenreId.toUpperCase(), validGenreId],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.genres).toEqual([validGenreId]);
    }
  });

  it('validates genre items including non-RFC version hex UUIDs used in QA seed', () => {
    const parsed = genreItemSchema.safeParse({
      id: '00000000-0000-8001-8001-000000000007',
      name: 'Fiksi',
    });
    expect(parsed.success).toBe(true);
  });
});

