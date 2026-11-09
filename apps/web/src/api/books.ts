import {
  ALLOWED_COVER_EXTENSIONS,
  ALLOWED_COVER_MIME_TYPES,
  MAX_COVER_SIZE_BYTES,
  type GenreStatus,
  type Pagination,
} from '@readonly/shared';
import {
  apiDelete,
  apiGetResponse,
  apiPatchForm,
  apiPostForm,
  queryString,
  request,
} from './client';
import { bookDetailSchema, catalogSchema, envelope } from './contracts';

export interface BookGenre {
  id: string;
  name: string;
  status: GenreStatus;
}

export interface AdminBook {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publication_year: number;
  synopsis: string;
  cover_url: string | null;
  genres: BookGenre[];
  available_count: number;
  is_available: boolean;
  availability_label: 'Tersedia' | 'Tidak Tersedia';
  average_rating?: number | null;
}

export interface AdminGenre {
  id: string;
  name: string;
  status: GenreStatus;
  book_count?: number;
}

export interface AdminBookList {
  books: AdminBook[];
  authors: string[];
  pagination: Pagination;
}

export interface AdminBookQuery {
  q?: string;
  author?: string;
  genre?: string;
  page?: number;
  limit?: number;
}

function makeQueryPath(query: AdminBookQuery): string {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.author) params.set('author', query.author);
  if (query.genre) params.set('genre', query.genre);
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 10));
  return `/admin/books?${params.toString()}`;
}

export async function getAdminBooks(
  query: AdminBookQuery,
  signal?: AbortSignal,
): Promise<AdminBookList> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  const response = await apiGetResponse<AdminBook[]>(makeQueryPath(query), signal);
  const total = response.pagination?.total ?? response.data.length;

  return {
    books: response.data,
    authors: response.authors ?? [],
    pagination: response.pagination ?? {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAdminGenres(signal?: AbortSignal): Promise<AdminGenre[]> {
  const firstPage = await apiGetResponse<AdminGenre[]>(
    '/admin/genres?page=1&limit=50',
    signal,
  );
  const genres = [...firstPage.data];
  const totalPages = firstPage.pagination?.totalPages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await apiGetResponse<AdminGenre[]>(
      `/admin/genres?page=${page}&limit=50`,
      signal,
    );
    genres.push(...response.data);
  }

  return genres.filter((genre) => genre.status === 'active');
}

export async function getAdminBook(
  bookId: string,
  signal?: AbortSignal,
): Promise<AdminBook> {
  const response = await apiGetResponse<AdminBook>(`/books/${bookId}`, signal);
  return response.data;
}

export async function createAdminBook(
  formData: FormData,
): Promise<{ id: string; message: string }> {
  const response = await apiPostForm<{ id: string }>('/admin/books', formData);
  return {
    id: response.data.id,
    message: response.message ?? 'Buku berhasil ditambahkan',
  };
}

export async function updateAdminBook(
  bookId: string,
  formData: FormData,
): Promise<{ id: string; message: string }> {
  const response = await apiPatchForm<{ id: string }>(
    `/admin/books/${bookId}`,
    formData,
  );
  return {
    id: response.data.id,
    message: response.message ?? 'Buku berhasil diubah',
  };
}

export async function deleteAdminBook(
  bookId: string,
): Promise<{ id: string; message: string }> {
  const response = await apiDelete<{ id: string }>(`/admin/books/${bookId}`);
  return {
    id: response.data.id,
    message: response.message ?? 'Buku berhasil dihapus',
  };
}

export function getCoverValidationMessage(
  file: Pick<File, 'name' | 'type' | 'size'>,
): string | null {
  const extension = file.name.includes('.')
    ? `.${file.name.split('.').pop()?.toLocaleLowerCase('en-US') ?? ''}`
    : '';
  const allowedExtensions: readonly string[] = ALLOWED_COVER_EXTENSIONS;
  const allowedMimeTypes: readonly string[] = ALLOWED_COVER_MIME_TYPES;
  const mimeType = file.type.toLocaleLowerCase('en-US');

  if (
    !allowedExtensions.includes(extension) ||
    (mimeType.length > 0 && !allowedMimeTypes.includes(mimeType))
  ) {
    return 'Format file cover buku tidak sesuai';
  }

  if (file.size > MAX_COVER_SIZE_BYTES) {
    return 'Ukuran file cover buku tidak boleh lebih dari 5Mb';
  }

  return null;
}

export function getGenreIdsForSubmit(
  selectedGenreId: string,
  originalGenres: BookGenre[],
): string[] {
  const originalGenreIds = originalGenres.map((genre) => genre.id);
  const originalSelectedId = originalGenreIds[0] ?? '';

  if (selectedGenreId && selectedGenreId === originalSelectedId) {
    return originalGenreIds;
  }

  return selectedGenreId ? [selectedGenreId] : [];
}


// API katalog buku dari branch dev (Home dan Book Detail).
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
