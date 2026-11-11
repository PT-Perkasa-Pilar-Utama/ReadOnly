import { z } from 'zod';
import { paginationSchema } from './api';
import { UUID_REGEX } from './auth';
import { GENRE_STATUSES } from './constants';

export const bookGenreItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  name: z.string().trim().min(1),
  status: z.enum(GENRE_STATUSES),
});

export type BookGenreItem = z.infer<typeof bookGenreItemSchema>;

export const adminBookItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  title: z.string().min(1),
  author: z.string().min(1),
  publisher: z.string().min(1),
  publication_year: z.number().int(),
  synopsis: z.string(),
  cover_url: z.string(),
  genres: z.array(bookGenreItemSchema),
  available_count: z.number().int().nonnegative(),
  is_available: z.boolean(),
  availability_label: z.enum(['Tersedia', 'Tidak Tersedia']),
  average_rating: z.number().nullable(),
});

export type AdminBookItem = z.infer<typeof adminBookItemSchema>;

export const adminBooksResponseSchema = z.object({
  data: z.array(adminBookItemSchema),
  authors: z.array(z.string()),
  pagination: paginationSchema,
});

export type AdminBooksResponse = z.infer<typeof adminBooksResponseSchema>;

export const catalogBookItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  title: z.string().min(1),
  author: z.string().min(1),
  publisher: z.string().min(1),
  publication_year: z.number().int(),
  cover_url: z.string(),
  genres: z.array(bookGenreItemSchema),
  available_count: z.number().int().nonnegative(),
  is_available: z.boolean(),
  availability_label: z.enum(['Tersedia', 'Tidak Tersedia']),
  average_rating: z.number().nullable(),
});

export type CatalogBookItem = z.infer<typeof catalogBookItemSchema>;

export const catalogBooksResponseSchema = z.object({
  data: z.array(catalogBookItemSchema),
  recommendations: z.array(catalogBookItemSchema),
  authors: z.array(z.string()),
  pagination: paginationSchema,
});

export type CatalogBooksResponse = z.infer<typeof catalogBooksResponseSchema>;

export const bookDetailItemSchema = adminBookItemSchema;
export type BookDetailItem = AdminBookItem;

export const bookDetailResponseSchema = z.object({
  data: bookDetailItemSchema,
});

export type BookDetailResponse = z.infer<typeof bookDetailResponseSchema>;

export interface BookMutationResponseData {
  id: string;
}
