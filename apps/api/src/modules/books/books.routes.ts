import path from 'node:path';
import {
  type ApiSuccessEnvelope,
  type GenreItem,
  UUID_REGEX,
} from '@readonly/shared';
import { Elysia } from 'elysia';
import { createNotFoundError, fromZodError } from '../../shared/errors';
import { requireRole } from '../auth/auth.routes';
import type { AuthService } from '../auth/auth.service';
import { adminBooksQuerySchema, validateBookFormData } from './books.schema';
import type { BooksService } from './books.service';

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

export function createBooksRoutes(
  booksService: BooksService,
  authService?: AuthService,
) {
  return new Elysia()
    .get('/genres', async (): Promise<ApiSuccessEnvelope<GenreItem[]>> => {
      const activeGenres = await booksService.listActiveGenres();
      return {
        data: activeGenres,
      };
    })
    .get('/covers/:filename', async ({ params: { filename }, set }) => {
      if (!filename || !SAFE_FILENAME_REGEX.test(filename)) {
        throw createNotFoundError('Cover tidak ditemukan.');
      }

      const storage = booksService.getStorage();
      if (!storage.readCover) {
        throw createNotFoundError('Cover tidak ditemukan.');
      }

      const cleanName = path.basename(filename);
      const file = await storage.readCover(cleanName);
      if (!file) {
        throw createNotFoundError('Cover tidak ditemukan.');
      }

      set.headers['content-type'] = file.mimeType;
      return file.data;
    })
    .get('/admin/books', async ({ query, request }) => {
      if (authService) {
        await requireRole(request, authService, 'admin');
      }

      const parsed = adminBooksQuerySchema.safeParse(query);
      if (!parsed.success) {
        throw fromZodError(parsed.error);
      }

      return booksService.listAdminBooks(parsed.data);
    })
    .post('/admin/books', async ({ body, request, set }) => {
      if (authService) {
        await requireRole(request, authService, 'admin');
      }

      const formData = validateBookFormData(body);
      const rawCover =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>).cover
          : undefined;

      const result = await booksService.createBook(formData, rawCover);
      set.status = 201;
      return result;
    })
    .patch('/admin/books/:id', async ({ body, params: { id }, request }) => {
      if (authService) {
        await requireRole(request, authService, 'admin');
      }

      if (!UUID_REGEX.test(id)) {
        throw createNotFoundError('Buku tidak ditemukan.');
      }

      const formData = validateBookFormData(body);
      const rawCover =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>).cover
          : undefined;

      return booksService.updateBook(id, formData, rawCover);
    })
    .delete('/admin/books/:id', async ({ params: { id }, request }) => {
      if (authService) {
        await requireRole(request, authService, 'admin');
      }

      if (!UUID_REGEX.test(id)) {
        throw createNotFoundError('Buku tidak ditemukan.');
      }

      return booksService.deleteBook(id);
    });
}
