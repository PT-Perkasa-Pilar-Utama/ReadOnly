import type { GenreItem } from '@readonly/shared';
import type { BooksRepository } from './books.repository';

export interface ActiveGenreProvider {
  listActiveGenres(): Promise<GenreItem[]>;
  areAllGenresActive(genreIds: string[]): Promise<boolean>;
}

export class BooksService implements ActiveGenreProvider {
  constructor(private readonly repository: BooksRepository) {}

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
}
