import {
  type AdminBookItem,
  type AdminBooksResponse,
  API_MESSAGES,
  type BookMutationResponseData,
  type GenreItem,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import {
  MemoryStorageAdapter,
  type StoragePort,
  validateAndExtractCover,
} from '../../ports/storage';
import {
  createForbiddenError,
  createNotFoundError,
  createValidationError,
} from '../../shared/errors';
import type { BooksRepository } from './books.repository';
import type { AdminBooksQuery, ValidatedBookFormData } from './books.schema';

export interface ActiveGenreProvider {
  listActiveGenres(): Promise<GenreItem[]>;
  areAllGenresActive(genreIds: string[]): Promise<boolean>;
}

export interface BooksServiceOptions {
  repository: BooksRepository;
  storage?: StoragePort;
  clock?: ClockPort;
}

export class BooksService implements ActiveGenreProvider {
  private readonly repository: BooksRepository;
  private readonly storage: StoragePort;
  private readonly clock: ClockPort;

  constructor(
    repositoryOrOptions: BooksRepository | BooksServiceOptions,
    storage?: StoragePort,
    clock?: ClockPort,
  ) {
    if ('repository' in repositoryOrOptions) {
      this.repository = repositoryOrOptions.repository;
      this.storage = repositoryOrOptions.storage ?? new MemoryStorageAdapter();
      this.clock = repositoryOrOptions.clock ?? new SystemClock();
    } else {
      this.repository = repositoryOrOptions;
      this.storage = storage ?? new MemoryStorageAdapter();
      this.clock = clock ?? new SystemClock();
    }
  }

  getStorage(): StoragePort {
    return this.storage;
  }

  async listActiveGenres(): Promise<GenreItem[]> {
    return this.repository.listActiveGenres();
  }

  async areAllGenresActive(genreIds: string[]): Promise<boolean> {
    if (genreIds.length === 0) {
      return false;
    }

    const uniqueIds = Array.from(
      new Set(genreIds.map((id) => id.toLowerCase())),
    );
    const activeIds = await this.repository.findActiveGenreIds(uniqueIds);
    const activeSet = new Set(activeIds.map((id) => id.toLowerCase()));

    return uniqueIds.every((id) => activeSet.has(id));
  }

  async listAdminBooks(query: AdminBooksQuery): Promise<AdminBooksResponse> {
    const result = await this.repository.listAdminBooks({
      q: query.q,
      author: query.author,
      genre: query.genre,
      page: query.page,
      limit: query.limit,
    });

    const totalPages =
      result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

    const data: AdminBookItem[] = result.data.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      publication_year: book.publicationYear,
      synopsis: book.synopsis,
      cover_url: this.storage.getCoverUrl(book.coverPath ?? ''),
      genres: book.genres,
      available_count: book.availableCount,
      is_available: book.availableCount > 0,
      availability_label:
        book.availableCount > 0 ? 'Tersedia' : 'Tidak Tersedia',
      average_rating: book.averageRating,
    }));

    return {
      data,
      authors: result.authors,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages,
      },
    };
  }

  async getBookById(id: string): Promise<{ data: AdminBookItem }> {
    const book = await this.repository.findBookById(id);
    if (!book) {
      throw createNotFoundError('Buku tidak ditemukan.');
    }

    return {
      data: {
        id: book.id,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        publication_year: book.publicationYear,
        synopsis: book.synopsis,
        cover_url: this.storage.getCoverUrl(book.coverPath ?? ''),
        genres: book.genres,
        available_count: book.availableCount,
        is_available: book.availableCount > 0,
        availability_label:
          book.availableCount > 0 ? 'Tersedia' : 'Tidak Tersedia',
        average_rating: book.averageRating,
      },
    };
  }

  async createBook(
    formData: ValidatedBookFormData,
    coverFile: unknown,
  ): Promise<{ data: BookMutationResponseData; message: string }> {
    if (!coverFile) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'cover');
    }

    const { buffer, fileName } = await validateAndExtractCover(coverFile);

    // Validate that all genre_ids exist and are active (AC-05.01)
    const allGenres = await this.repository.findAllGenresByIds(
      formData.genre_ids,
    );
    if (allGenres.length !== formData.genre_ids.length) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'genre_ids');
    }

    const anyInactive = allGenres.some((g) => g.status !== 'active');
    if (anyInactive) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'genre_ids');
    }

    const coverPath = await this.storage.uploadCover(fileName, buffer);

    try {
      const created = await this.repository.createBook({
        title: formData.title,
        author: formData.author,
        publisher: formData.publisher,
        publicationYear: formData.publication_year,
        synopsis: formData.synopsis,
        availableCount: formData.available_count,
        coverPath,
        genreIds: formData.genre_ids,
        createdAt: this.clock.utcNow(),
      });

      return {
        data: { id: created.id },
        message: API_MESSAGES.BOOK_ADDED,
      };
    } catch (err) {
      await this.storage.detachCover(coverPath);
      throw err;
    }
  }

  async updateBook(
    id: string,
    formData: ValidatedBookFormData,
    coverFile?: unknown,
  ): Promise<{ data: BookMutationResponseData; message: string }> {
    const existing = await this.repository.findBookById(id);
    if (!existing) {
      throw createNotFoundError('Buku tidak ditemukan.');
    }

    // AC-05.10: Inactive genres that were already attached to this book are permitted.
    // Any new genre being added must be active.
    const existingGenreIdSet = new Set(
      existing.genres.map((g) => g.id.toLowerCase()),
    );

    const allGenres = await this.repository.findAllGenresByIds(
      formData.genre_ids,
    );
    if (allGenres.length !== formData.genre_ids.length) {
      throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'genre_ids');
    }

    for (const genre of allGenres) {
      const isExistingOnBook = existingGenreIdSet.has(genre.id.toLowerCase());
      if (isExistingOnBook) {
        // Allowed even if status is inactive per AC-05.10
        continue;
      }
      if (genre.status !== 'active') {
        throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'genre_ids');
      }
    }

    let newCoverPath: string | undefined;
    if (
      coverFile &&
      typeof coverFile === 'object' &&
      'size' in coverFile &&
      (coverFile as { size: number }).size > 0
    ) {
      const { buffer, fileName } = await validateAndExtractCover(coverFile);
      newCoverPath = await this.storage.uploadCover(fileName, buffer);
    }

    try {
      const updated = await this.repository.updateBook(id, {
        title: formData.title,
        author: formData.author,
        publisher: formData.publisher,
        publicationYear: formData.publication_year,
        synopsis: formData.synopsis,
        availableCount: formData.available_count,
        ...(newCoverPath !== undefined ? { coverPath: newCoverPath } : {}),
        genreIds: formData.genre_ids,
      });

      if (!updated) {
        if (newCoverPath) {
          await this.storage.detachCover(newCoverPath);
        }
        throw createNotFoundError('Buku tidak ditemukan.');
      }

      return {
        data: { id },
        message: API_MESSAGES.BOOK_UPDATED,
      };
    } catch (err) {
      if (newCoverPath) {
        await this.storage.detachCover(newCoverPath);
      }
      throw err;
    }
  }

  async deleteBook(
    id: string,
  ): Promise<{ data: BookMutationResponseData; message: string }> {
    const result = await this.repository.deleteBook(id, this.clock.utcNow());

    if (result === 'not_found') {
      throw createNotFoundError('Buku tidak ditemukan.');
    }

    if (result === 'has_active_loans') {
      throw createForbiddenError(API_MESSAGES.BOOK_DELETE_ACTIVE_LOANS);
    }

    return {
      data: { id },
      message: API_MESSAGES.BOOK_DELETED,
    };
  }
}
