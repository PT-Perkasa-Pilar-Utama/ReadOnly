import { describe, expect, it } from 'bun:test';
import {
  adminBookItemSchema,
  bookDetailResponseSchema,
  catalogBookItemSchema,
  catalogBooksResponseSchema,
} from './books';

describe('shared books schemas (BE-S2-01 / US-07)', () => {
  const validBook = {
    id: '00000000-0000-4000-8002-000000000001',
    title: 'Bumi Manusia',
    author: 'Pramoedya Ananta Toer',
    publisher: 'Hasta Mitra',
    publication_year: 1980,
    cover_url: '/api/v1/covers/00000000-0000-4000-8002-000000000001.jpg',
    genres: [
      {
        id: '00000000-0000-4000-8001-000000000001',
        name: 'Fiksi',
        status: 'active' as const,
      },
    ],
    available_count: 3,
    is_available: true,
    availability_label: 'Tersedia' as const,
    average_rating: 4.5,
  };

  it('validates catalog book item without synopsis', () => {
    const parsed = catalogBookItemSchema.safeParse(validBook);
    expect(parsed.success).toBe(true);
  });

  it('validates book detail item with synopsis', () => {
    const parsed = adminBookItemSchema.safeParse({
      ...validBook,
      synopsis: 'Kisah Minke di era kolonial Hindia Belanda.',
    });
    expect(parsed.success).toBe(true);
  });

  it('validates catalog books response envelope with recommendations', () => {
    const response = {
      data: [validBook],
      recommendations: [validBook],
      authors: ['Pramoedya Ananta Toer'],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };

    const parsed = catalogBooksResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
  });

  it('validates book detail response envelope', () => {
    const response = {
      data: {
        ...validBook,
        synopsis: 'Kisah Minke di era kolonial Hindia Belanda.',
      },
    };

    const parsed = bookDetailResponseSchema.safeParse(response);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid UUID in catalog book item', () => {
    const parsed = catalogBookItemSchema.safeParse({
      ...validBook,
      id: 'not-a-uuid',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid availability_label', () => {
    const parsed = catalogBookItemSchema.safeParse({
      ...validBook,
      availability_label: 'Ada',
    });
    expect(parsed.success).toBe(false);
  });
});

