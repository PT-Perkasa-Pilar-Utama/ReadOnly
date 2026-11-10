import { describe, expect, it } from 'bun:test';
import {
  API_MESSAGES,
  adminUserDetailResponseDataSchema,
  adminUserListItemSchema,
  adminUsersQuerySchema,
  authMeResponseDataSchema,
  createAdminUserSchema,
  genreItemSchema,
  loginSchema,
  registerSchema,
  registerValidateSchema,
  updateUserStatusSchema,
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

  it('validates and normalizes create admin user payload (AC-12.02)', () => {
    const parsed = createAdminUserSchema.safeParse({
      full_name: 'Admin Baru',
      email: '  Admin.Baru@ReadOnly.ppu.co.id  ',
      phone_number: '081199990001',
      password: 'password123',
      confirm_password: 'password123',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe('admin.baru@readonly.ppu.co.id');
      expect(parsed.data.full_name).toBe('Admin Baru');
      expect(parsed.data.phone_number).toBe('081199990001');
    }
  });

  it('rejects empty mandatory field on create admin with verbatim AC-12.03 message', () => {
    const parsed = createAdminUserSchema.safeParse({
      full_name: '',
      email: 'admin.baru@readonly.ppu.co.id',
      phone_number: '081199990001',
      password: 'password123',
      confirm_password: 'password123',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(API_MESSAGES.FIELD_REQUIRED);
      expect(parsed.error.issues[0]?.path).toEqual(['full_name']);
    }
  });

  it('rejects invalid email format on create admin with verbatim AC-12.04 message', () => {
    const parsed = createAdminUserSchema.safeParse({
      full_name: 'Admin Baru',
      email: 'bukan-email',
      phone_number: '081199990001',
      password: 'password123',
      confirm_password: 'password123',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        API_MESSAGES.INVALID_EMAIL_FORMAT,
      );
      expect(parsed.error.issues[0]?.path).toEqual(['email']);
    }
  });

  it('rejects mismatched passwords on create admin with verbatim AC-12.04 message', () => {
    const parsed = createAdminUserSchema.safeParse({
      full_name: 'Admin Baru',
      email: 'admin.baru@readonly.ppu.co.id',
      phone_number: '081199990001',
      password: 'password123',
      confirm_password: 'password456',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        API_MESSAGES.PASSWORD_MISMATCH,
      );
      expect(parsed.error.issues[0]?.path).toEqual(['confirm_password']);
    }
  });

  it('validates admin users query schema defaults and pagination bounds', () => {
    const parsed = adminUsersQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(10);
      expect(parsed.data.role).toBeUndefined();
    }

    const invalidLimit = adminUsersQuerySchema.safeParse({ limit: 51 });
    expect(invalidLimit.success).toBe(false);

    const invalidRole = adminUsersQuerySchema.safeParse({ role: 'superadmin' });
    expect(invalidRole.success).toBe(false);
  });

  it('validates admin user detail and list item response schemas', () => {
    const listItem = adminUserListItemSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000001',
      full_name: 'Admin Perpus',
      email: 'admin@readonly.ppu.co.id',
      phone_number: '081100000001',
      role: 'admin',
      status: 'active',
    });
    expect(listItem.success).toBe(true);

    const detailItem = adminUserDetailResponseDataSchema.safeParse({
      id: '00000000-0000-4000-8000-000000000002',
      full_name: 'Member Satu',
      email: 'member1@readonly.ppu.co.id',
      phone_number: '081200000001',
      address: 'Jl. Sudirman No. 1, Jakarta',
      role: 'member',
      status: 'active',
    });
    expect(detailItem.success).toBe(true);
  });

  it('validates update user status schema with active and inactive values', () => {
    expect(updateUserStatusSchema.safeParse({ status: 'active' }).success).toBe(
      true,
    );
    expect(
      updateUserStatusSchema.safeParse({ status: 'inactive' }).success,
    ).toBe(true);
    expect(
      updateUserStatusSchema.safeParse({ status: 'suspended' }).success,
    ).toBe(false);
  });
});
