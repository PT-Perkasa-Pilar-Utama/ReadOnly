import { type Database, genres, QA_IDS } from '@readonly/db';
import type { GenreItem, GenreStatus } from '@readonly/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';

export interface GenreSeedRecord {
  id: string;
  name: string;
  status: GenreStatus;
}

export interface BooksRepository {
  listActiveGenres(): Promise<GenreItem[]>;
  findActiveGenreIds(ids: string[]): Promise<string[]>;
}

export class DrizzleBooksRepository implements BooksRepository {
  constructor(private readonly db: Database) {}

  async listActiveGenres(): Promise<GenreItem[]> {
    return this.db
      .select({
        id: genres.id,
        name: genres.name,
      })
      .from(genres)
      .where(eq(genres.status, 'active'))
      .orderBy(asc(genres.name));
  }

  async findActiveGenreIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({ id: genres.id })
      .from(genres)
      .where(and(eq(genres.status, 'active'), inArray(genres.id, ids)));

    return rows.map((row) => row.id);
  }
}

const DEFAULT_IN_MEMORY_GENRES: GenreSeedRecord[] = [
  { id: QA_IDS.genres.bisnis, name: 'Bisnis', status: 'active' },
  { id: QA_IDS.genres.fiksi, name: 'Fiksi', status: 'active' },
  { id: QA_IDS.genres.sejarah, name: 'Sejarah', status: 'active' },
  { id: QA_IDS.genres.teknologi, name: 'Teknologi', status: 'active' },
  { id: QA_IDS.genres.sains, name: 'Sains', status: 'inactive' },
  {
    id: QA_IDS.genres.inactive,
    name: 'Ensiklopedia Lama',
    status: 'inactive',
  },
];

export class InMemoryBooksRepository implements BooksRepository {
  private readonly records: GenreSeedRecord[];

  constructor(initialGenres: GenreSeedRecord[] = DEFAULT_IN_MEMORY_GENRES) {
    this.records = initialGenres.map((item) => ({ ...item }));
  }

  async listActiveGenres(): Promise<GenreItem[]> {
    return this.records
      .filter((genre) => genre.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));
  }

  async findActiveGenreIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const lookup = new Set(ids.map((id) => id.toLowerCase()));
    return this.records
      .filter(
        (genre) =>
          genre.status === 'active' && lookup.has(genre.id.toLowerCase()),
      )
      .map((genre) => genre.id.toLowerCase());
  }
}

