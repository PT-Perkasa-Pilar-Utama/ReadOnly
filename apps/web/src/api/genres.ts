import {
  GENRE_STATUSES,
  type GenreStatus,
  type Pagination,
  paginationSchema,
} from '@readonly/shared';
import { z } from 'zod';
import { json, queryString, request } from './client';
import { envelope } from './contracts';

const adminGenreSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(GENRE_STATUSES),
  book_count: z.number().int().nonnegative(),
});

const genreListSchema = z.object({
  data: z.array(adminGenreSchema),
  pagination: paginationSchema,
});

export type AdminGenreItem = z.infer<typeof adminGenreSchema>;

export interface AdminGenreList {
  genres: AdminGenreItem[];
  pagination: Pagination;
}

export async function getAdminGenreList(
  query: { q?: string; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<AdminGenreList> {
  const result = await request(
    `/admin/genres?${queryString({
      ...(query.q?.trim() ? { q: query.q.trim() } : {}),
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    })}`,
    genreListSchema,
    signal ? { signal } : {},
  );

  return {
    genres: result.data,
    pagination: result.pagination,
  };
}

export async function createAdminGenre(name: string) {
  return request(
    '/admin/genres',
    envelope(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.literal('active'),
      }),
    ),
    json('POST', { name: name.trim() }),
  );
}

export async function updateAdminGenre(
  genreId: string,
  input: { name?: string; status?: GenreStatus },
) {
  return request(
    `/admin/genres/${encodeURIComponent(genreId)}`,
    envelope(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(['active', 'inactive']),
      }),
    ),
    json('PATCH', {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    }),
  );
}

export async function deleteAdminGenre(genreId: string) {
  return request(
    `/admin/genres/${encodeURIComponent(genreId)}`,
    envelope(z.object({ id: z.string() })),
    { method: 'DELETE' },
  );
}

export function getGenreFormError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Terjadi kesalahan. Silakan coba lagi.';
  }
  if (error.message === 'Genre sudah ada') return 'Genre sudah ada';
  if (error.message === 'Field harus diisi!') return 'Field harus diisi!';
  return error.message;
}
