import { z } from 'zod';
import { type PaginatedResponse, paginationSchema } from './api';
import { API_MESSAGES, UUID_REGEX } from './auth';
import { GENRE_STATUSES, type GenreStatus } from './constants';

export const adminGenreItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  name: z.string().min(1),
  status: z.enum(GENRE_STATUSES),
  book_count: z.number().int().nonnegative(),
});

export type AdminGenreItem = z.infer<typeof adminGenreItemSchema>;

export const adminGenresResponseSchema = z.object({
  data: z.array(adminGenreItemSchema),
  pagination: paginationSchema,
});

export type AdminGenresResponse = PaginatedResponse<AdminGenreItem>;

export const createGenreInputSchema = z.object({
  name: z
    .string({ message: API_MESSAGES.FIELD_REQUIRED })
    .trim()
    .min(1, { message: API_MESSAGES.FIELD_REQUIRED }),
});

export type CreateGenreInput = z.infer<typeof createGenreInputSchema>;

export const updateGenreInputSchema = z
  .object({
    name: z
      .string({ message: API_MESSAGES.FIELD_REQUIRED })
      .trim()
      .min(1, { message: API_MESSAGES.FIELD_REQUIRED })
      .optional(),
    status: z.enum(GENRE_STATUSES).optional(),
  })
  .refine((data) => data.name !== undefined || data.status !== undefined, {
    message: API_MESSAGES.FIELD_REQUIRED,
    path: ['name'],
  });

export type UpdateGenreInput = z.infer<typeof updateGenreInputSchema>;

export interface CreateGenreResponseData {
  id: string;
  name: string;
  status: 'active';
}

export interface UpdateGenreResponseData {
  id: string;
  name: string;
  status: GenreStatus;
}

export interface DeleteGenreResponseData {
  id: string;
}
