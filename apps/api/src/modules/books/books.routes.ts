import type { ApiSuccessEnvelope, GenreItem } from '@readonly/shared';
import { Elysia } from 'elysia';
import type { BooksService } from './books.service';

export function createBooksRoutes(booksService: BooksService) {
  return new Elysia().get(
    '/genres',
    async (): Promise<ApiSuccessEnvelope<GenreItem[]>> => {
      const activeGenres = await booksService.listActiveGenres();
      return {
        data: activeGenres,
      };
    },
  );
}
