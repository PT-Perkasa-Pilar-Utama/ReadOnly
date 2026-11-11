import {
  type AdminBooksResponse,
  type AdminGenreItem,
  type AdminGenresResponse,
  API_MESSAGES,
  adminBooksResponseSchema,
  adminGenreItemSchema,
  adminGenresResponseSchema,
  type BookDetailItem,
  type BookDetailResponse,
  type BookGenreItem,
  type BookMutationResponseData,
  bookDetailItemSchema,
  bookDetailResponseSchema,
  bookGenreItemSchema,
  type CatalogBookItem,
  type CatalogBooksResponse,
  type CreateGenreInput,
  type CreateGenreResponseData,
  catalogBookItemSchema,
  catalogBooksResponseSchema,
  createGenreInputSchema,
  type DeleteGenreResponseData,
  type GenreItem,
  genreItemSchema,
  type UpdateGenreInput,
  type UpdateGenreResponseData,
  UUID_REGEX,
  updateGenreInputSchema,
} from '@readonly/shared';
import { z } from 'zod';
import { createValidationError } from '../../shared/errors';

export {
  type AdminBooksResponse,
  type AdminGenreItem,
  type AdminGenresResponse,
  adminBooksResponseSchema,
  adminGenreItemSchema,
  adminGenresResponseSchema,
  type BookDetailItem,
  type BookDetailResponse,
  type BookGenreItem,
  type BookMutationResponseData,
  bookDetailItemSchema,
  bookDetailResponseSchema,
  bookGenreItemSchema,
  type CatalogBookItem,
  type CatalogBooksResponse,
  type CreateGenreInput,
  type CreateGenreResponseData,
  catalogBookItemSchema,
  catalogBooksResponseSchema,
  createGenreInputSchema,
  type DeleteGenreResponseData,
  type GenreItem,
  genreItemSchema,
  type UpdateGenreInput,
  type UpdateGenreResponseData,
  updateGenreInputSchema,
};

export const activeGenresResponseSchema = z.object({
  data: z.array(genreItemSchema),
});

export type ActiveGenresResponse = z.infer<typeof activeGenresResponseSchema>;

export const catalogBooksQuerySchema = z.object({
  q: z.string().optional(),
  author: z.string().optional(),
  genre: z
    .string()
    .optional()
    .refine((val) => val === undefined || val === '' || UUID_REGEX.test(val), {
      message: 'Genre ID tidak valid',
    })
    .transform((val) => (val === '' ? undefined : val)),
  recommends: z
    .preprocess(
      (val) => {
        if (val === undefined || val === '') return false;
        if (val === 'true' || val === true) return true;
        if (val === 'false' || val === false) return false;
        return val;
      },
      z.boolean({ message: 'Parameter recommends tidak valid' }),
    )
    .default(false),
  page: z
    .preprocess(
      (val) => {
        if (val === undefined || val === '') return 1;
        const num = Number(val);
        return Number.isNaN(num) ? val : num;
      },
      z
        .number({ message: 'Permintaan tidak valid.' })
        .int({ message: 'Permintaan tidak valid.' })
        .min(1, { message: 'Permintaan tidak valid.' }),
    )
    .default(1),
  limit: z
    .preprocess(
      (val) => {
        if (val === undefined || val === '') return 10;
        const num = Number(val);
        return Number.isNaN(num) ? val : num;
      },
      z
        .number({ message: 'Permintaan tidak valid.' })
        .int({ message: 'Permintaan tidak valid.' })
        .min(1, { message: 'Permintaan tidak valid.' })
        .max(50, { message: 'Permintaan tidak valid.' }),
    )
    .default(10),
});

export type CatalogBooksQuery = z.infer<typeof catalogBooksQuerySchema>;

export const adminBooksQuerySchema = z.object({
  q: z.string().optional(),
  author: z.string().optional(),
  genre: z
    .string()
    .optional()
    .refine((val) => val === undefined || UUID_REGEX.test(val), {
      message: 'Genre ID tidak valid',
    }),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type AdminBooksQuery = z.infer<typeof adminBooksQuerySchema>;

export const adminGenresQuerySchema = z.object({
  q: z.string().optional(),
  page: z
    .preprocess(
      (val) => {
        if (val === undefined || val === '') return 1;
        const num = Number(val);
        return Number.isNaN(num) ? val : num;
      },
      z
        .number()
        .int({ message: 'Permintaan tidak valid.' })
        .min(1, { message: 'Permintaan tidak valid.' }),
    )
    .default(1),
  limit: z
    .preprocess(
      (val) => {
        if (val === undefined || val === '') return 10;
        const num = Number(val);
        return Number.isNaN(num) ? val : num;
      },
      z
        .number()
        .int({ message: 'Permintaan tidak valid.' })
        .min(1, { message: 'Permintaan tidak valid.' })
        .max(50, { message: 'Permintaan tidak valid.' }),
    )
    .default(10),
});

export type AdminGenresQuery = z.infer<typeof adminGenresQuerySchema>;

export interface ValidatedBookFormData {
  title: string;
  author: string;
  publisher: string;
  publication_year: number;
  synopsis: string;
  available_count: number;
  genre_ids: string[];
}

export function parseGenreIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item) => item.length > 0);
        }
      } catch {
        // Fall back to treating as single string
      }
    }
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return trimmed.length > 0 ? [trimmed] : [];
  }

  return [];
}

export function validateBookFormData(body: unknown): ValidatedBookFormData {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'title');
  }

  const raw = body as Record<string, unknown>;

  const rawTitle = raw.title;
  if (typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'title');
  }
  const title = rawTitle.trim();

  const rawAuthor = raw.author;
  if (typeof rawAuthor !== 'string' || rawAuthor.trim().length === 0) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'author');
  }
  const author = rawAuthor.trim();

  const rawPublisher = raw.publisher;
  if (typeof rawPublisher !== 'string' || rawPublisher.trim().length === 0) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'publisher');
  }
  const publisher = rawPublisher.trim();

  const rawYear = raw.publication_year;
  if (rawYear === undefined || rawYear === null) {
    throw createValidationError(
      API_MESSAGES.FIELD_REQUIRED,
      'publication_year',
    );
  }
  const yearStr = String(rawYear).trim();
  if (yearStr.length === 0) {
    throw createValidationError(
      API_MESSAGES.FIELD_REQUIRED,
      'publication_year',
    );
  }
  const parsedYear = Number(yearStr);
  if (!Number.isInteger(parsedYear) || parsedYear <= 0 || parsedYear > 3000) {
    throw createValidationError(
      API_MESSAGES.FIELD_REQUIRED,
      'publication_year',
    );
  }

  const rawSynopsis = raw.synopsis;
  if (typeof rawSynopsis !== 'string' || rawSynopsis.trim().length === 0) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'synopsis');
  }
  const synopsis = rawSynopsis.trim();

  const rawCount = raw.available_count;
  if (rawCount === undefined || rawCount === null) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'available_count');
  }
  const countStr = String(rawCount).trim();
  if (countStr.length === 0) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'available_count');
  }
  const parsedCount = Number(countStr);
  if (!Number.isInteger(parsedCount) || parsedCount < 0) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'available_count');
  }

  const genreIds = parseGenreIds(raw.genre_ids);
  if (genreIds.length === 0) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'genre_ids');
  }
  for (const id of genreIds) {
    if (!UUID_REGEX.test(id)) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'genre_ids');
    }
  }

  return {
    title,
    author,
    publisher,
    publication_year: parsedYear,
    synopsis,
    available_count: parsedCount,
    genre_ids: Array.from(new Set(genreIds.map((id) => id.toLowerCase()))),
  };
}
