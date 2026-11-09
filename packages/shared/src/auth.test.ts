import { describe, expect, it } from 'bun:test';
import { API_MESSAGES, authMeResponseDataSchema, loginSchema } from './auth';

describe('shared auth schemas', () => {
  it('validates and normalizes login payload', () => {
    const parsed = loginSchema.safeParse({
      email: '  NewMember@Gmail.com ',
      password: 'password',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        email: 'newmember@gmail.com',
        password: 'password',
      });
    }
  });

  it('rejects empty email with verbatim AC-02.04 message', () => {
    const parsed = loginSchema.safeParse({
      email: '   ',
      password: 'password',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(API_MESSAGES.EMAIL_REQUIRED);
      expect(parsed.error.issues[0]?.path).toEqual(['email']);
    }
  });

  it('rejects empty password with verbatim AC-02.04 message', () => {
    const parsed = loginSchema.safeParse({
      email: 'newmember@gmail.com',
      password: '',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        API_MESSAGES.PASSWORD_REQUIRED,
      );
      expect(parsed.error.issues[0]?.path).toEqual(['password']);
    }
  });

  it('reports both email and password issues when both fields are empty (AC-02.04)', () => {
    const parsed = loginSchema.safeParse({
      email: '',
      password: '',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toHaveLength(2);
      expect(parsed.error.issues[0]?.path).toEqual(['email']);
      expect(parsed.error.issues[0]?.message).toBe(API_MESSAGES.EMAIL_REQUIRED);
      expect(parsed.error.issues[1]?.path).toEqual(['password']);
      expect(parsed.error.issues[1]?.message).toBe(
        API_MESSAGES.PASSWORD_REQUIRED,
      );
    }
  });

  it('validates auth/me response data contract', () => {
    const parsed = authMeResponseDataSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000002',
      full_name: 'Member Satu',
      role: 'member',
      email: 'newmember@gmail.com',
    });

    expect(parsed.success).toBe(true);
  });
});
