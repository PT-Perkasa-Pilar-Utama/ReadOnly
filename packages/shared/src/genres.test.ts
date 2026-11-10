import { describe, expect, it } from 'bun:test';
import {
  API_MESSAGES,
  adminGenreItemSchema,
  createGenreInputSchema,
  updateGenreInputSchema,
} from './index';

describe('shared genre schemas (BE-S1-04 / US-11)', () => {
  it('validates admin genre item with valid UUID and non-negative book count', () => {
    const parsed = adminGenreItemSchema.safeParse({
      id: '00000000-0000-4000-8001-000000000001',
      name: 'Fiksi',
      status: 'active',
      book_count: 5,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid status in admin genre item', () => {
    const parsed = adminGenreItemSchema.safeParse({
      id: '00000000-0000-4000-8001-000000000001',
      name: 'Fiksi',
      status: 'archived',
      book_count: 5,
    });
    expect(parsed.success).toBe(false);
  });

  it('validates create genre input with trimmed name', () => {
    const parsed = createGenreInputSchema.safeParse({
      name: '  Sains Terapan  ',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Sains Terapan');
    }
  });

  it('rejects empty or whitespace-only name in create genre with verbatim AC-11.03 message', () => {
    const parsedEmpty = createGenreInputSchema.safeParse({ name: '' });
    expect(parsedEmpty.success).toBe(false);
    if (!parsedEmpty.success) {
      expect(parsedEmpty.error.issues[0]?.message).toBe(
        API_MESSAGES.FIELD_REQUIRED,
      );
      expect(parsedEmpty.error.issues[0]?.path).toEqual(['name']);
    }

    const parsedSpaces = createGenreInputSchema.safeParse({ name: '   ' });
    expect(parsedSpaces.success).toBe(false);
    if (!parsedSpaces.success) {
      expect(parsedSpaces.error.issues[0]?.message).toBe(
        API_MESSAGES.FIELD_REQUIRED,
      );
      expect(parsedSpaces.error.issues[0]?.path).toEqual(['name']);
    }
  });

  it('validates update genre input with name, status, or both', () => {
    const updateName = updateGenreInputSchema.safeParse({
      name: 'Teknologi Informasi',
    });
    expect(updateName.success).toBe(true);

    const updateStatus = updateGenreInputSchema.safeParse({
      status: 'inactive',
    });
    expect(updateStatus.success).toBe(true);

    const updateBoth = updateGenreInputSchema.safeParse({
      name: 'Teknologi Terapan',
      status: 'active',
    });
    expect(updateBoth.success).toBe(true);
  });

  it('rejects update genre input when neither name nor status is provided', () => {
    const parsed = updateGenreInputSchema.safeParse({});
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(API_MESSAGES.FIELD_REQUIRED);
      expect(parsed.error.issues[0]?.path).toEqual(['name']);
    }
  });

  it('rejects update genre input when name is empty or whitespace-only', () => {
    const parsed = updateGenreInputSchema.safeParse({ name: '   ' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(API_MESSAGES.FIELD_REQUIRED);
      expect(parsed.error.issues[0]?.path).toEqual(['name']);
    }
  });
});
