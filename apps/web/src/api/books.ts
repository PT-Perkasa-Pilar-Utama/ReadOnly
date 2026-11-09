import { request, queryString } from './client';
import { bookDetailSchema, catalogSchema, envelope } from './contracts';

// AC-07.01–AC-07.03: rekomendasi, pencarian, filter, dan paginasi berasal dari API.
export const getBooks = (
  filters: { q: string; author: string; genre: string; page: number },
  signal?: AbortSignal,
) =>
  request(
    `/books?${queryString({ ...filters, limit: 10, recommends: true })}`,
    catalogSchema,
    signal ? { signal } : {},
  );
export const getBook = async (id: string) =>
  (
    await request(
      `/books/${encodeURIComponent(id)}`,
      envelope(bookDetailSchema),
    )
  ).data;
