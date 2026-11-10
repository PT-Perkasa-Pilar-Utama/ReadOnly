import {
  bookGenres,
  books,
  type Database,
  genres,
  loans,
  QA_IDS,
  ratings,
  userGenres,
} from '@readonly/db';
import {
  type AdminGenreItem,
  API_MESSAGES,
  type GenreItem,
  type GenreStatus,
  type PaginatedResponse,
} from '@readonly/shared';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import {
  createConflictError,
  createGenreInUseError,
  createNotFoundError,
} from '../../shared/errors';

export interface GenreSeedRecord {
  id: string;
  name: string;
  status: GenreStatus;
}

export interface GenreRecord {
  id: string;
  name: string;
  status: GenreStatus;
  createdAt: Date;
}

export interface ListAdminGenresOptions {
  q?: string | undefined;
  page: number;
  limit: number;
}

export interface AdminBooksQueryParams {
  q?: string | undefined;
  author?: string | undefined;
  genre?: string | undefined;
  page: number;
  limit: number;
}

export interface BookRecordWithDetails {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  synopsis: string;
  availableCount: number;
  coverPath: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  genres: Array<{ id: string; name: string; status: GenreStatus }>;
  averageRating: number | null;
}

export interface CreateBookParams {
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  synopsis: string;
  availableCount: number;
  coverPath: string | null;
  genreIds: string[];
  createdAt: Date;
}

export interface UpdateBookParams {
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  synopsis: string;
  availableCount: number;
  coverPath?: string;
  genreIds: string[];
}

export interface BooksRepository {
  listActiveGenres(): Promise<GenreItem[]>;
  findActiveGenreIds(ids: string[]): Promise<string[]>;
  findAllGenresByIds(
    ids: string[],
  ): Promise<Array<{ id: string; name: string; status: GenreStatus }>>;
  listAdminBooks(params: AdminBooksQueryParams): Promise<{
    data: BookRecordWithDetails[];
    authors: string[];
    total: number;
  }>;
  findBookById(id: string): Promise<BookRecordWithDetails | null>;
  createBook(params: CreateBookParams): Promise<{ id: string }>;
  updateBook(id: string, params: UpdateBookParams): Promise<boolean>;
  deleteBook(
    id: string,
    now: Date,
  ): Promise<'deleted' | 'not_found' | 'has_active_loans'>;
  listAdminGenres(
    options: ListAdminGenresOptions,
  ): Promise<PaginatedResponse<AdminGenreItem>>;
  findGenreByName(
    name: string,
    excludeId?: string | undefined,
  ): Promise<GenreRecord | null>;
  getGenreById(id: string): Promise<GenreRecord | null>;
  createGenre(data: {
    name: string;
    status?: GenreStatus | undefined;
  }): Promise<GenreRecord>;
  updateGenre(
    id: string,
    data: { name?: string | undefined; status?: GenreStatus | undefined },
  ): Promise<GenreRecord>;
  isGenreInUse(id: string): Promise<boolean>;
  deleteGenre(id: string): Promise<void>;
}

function isPostgresUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const record = error as {
    code?: unknown;
    cause?: { code?: unknown };
  };

  return record.code === '23505' || record.cause?.code === '23505';
}

function isPostgresForeignKeyViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const record = error as {
    code?: unknown;
    cause?: { code?: unknown };
  };

  return record.code === '23503' || record.cause?.code === '23503';
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

  async findAllGenresByIds(
    ids: string[],
  ): Promise<Array<{ id: string; name: string; status: GenreStatus }>> {
    if (ids.length === 0) {
      return [];
    }

    return this.db
      .select({
        id: genres.id,
        name: genres.name,
        status: genres.status,
      })
      .from(genres)
      .where(inArray(genres.id, ids));
  }

  async listAdminBooks(params: AdminBooksQueryParams): Promise<{
    data: BookRecordWithDetails[];
    authors: string[];
    total: number;
  }> {
    const conditions = [isNull(books.deletedAt)];

    if (params.author && params.author.trim().length > 0) {
      conditions.push(eq(books.author, params.author.trim()));
    }

    if (params.genre && params.genre.trim().length > 0) {
      const genreSubquery = this.db
        .select({ bookId: bookGenres.bookId })
        .from(bookGenres)
        .where(eq(bookGenres.genreId, params.genre.trim()));

      conditions.push(inArray(books.id, genreSubquery));
    }

    if (params.q && params.q.trim().length > 0) {
      const escaped = params.q.trim().replace(/[%_\\]/g, '\\$&');
      const pattern = `%${escaped}%`;

      const genreSearchSubquery = this.db
        .select({ bookId: bookGenres.bookId })
        .from(bookGenres)
        .innerJoin(genres, eq(bookGenres.genreId, genres.id))
        .where(ilike(genres.name, pattern));

      const searchCondition = or(
        ilike(books.title, pattern),
        ilike(books.author, pattern),
        inArray(books.id, genreSearchSubquery),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(books)
      .where(and(...conditions));
    const total = countRow?.count ?? 0;

    const authorRows = await this.db
      .selectDistinct({ author: books.author })
      .from(books)
      .where(isNull(books.deletedAt))
      .orderBy(asc(books.author));
    const authors = authorRows.map((r) => r.author);

    if (total === 0) {
      return { data: [], authors, total: 0 };
    }

    const bookRows = await this.db
      .select()
      .from(books)
      .where(and(...conditions))
      .orderBy(desc(books.createdAt), desc(books.id))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    if (bookRows.length === 0) {
      return { data: [], authors, total };
    }

    const bookIds = bookRows.map((b) => b.id);

    const bookGenreRows = await this.db
      .select({
        bookId: bookGenres.bookId,
        genreId: genres.id,
        genreName: genres.name,
        genreStatus: genres.status,
      })
      .from(bookGenres)
      .innerJoin(genres, eq(bookGenres.genreId, genres.id))
      .where(inArray(bookGenres.bookId, bookIds))
      .orderBy(asc(genres.name));

    const genresByBookId = new Map<
      string,
      Array<{ id: string; name: string; status: GenreStatus }>
    >();
    for (const bg of bookGenreRows) {
      const list = genresByBookId.get(bg.bookId) ?? [];
      list.push({
        id: bg.genreId,
        name: bg.genreName,
        status: bg.genreStatus,
      });
      genresByBookId.set(bg.bookId, list);
    }

    const ratingRows = await this.db
      .select({
        bookId: ratings.bookId,
        average: sql<number>`round(avg(${ratings.score})::numeric, 1)::float`,
      })
      .from(ratings)
      .where(inArray(ratings.bookId, bookIds))
      .groupBy(ratings.bookId);

    const ratingByBookId = new Map<string, number>();
    for (const r of ratingRows) {
      ratingByBookId.set(r.bookId, Number(r.average));
    }

    const data: BookRecordWithDetails[] = bookRows.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      publisher: b.publisher,
      publicationYear: b.publicationYear,
      synopsis: b.synopsis,
      availableCount: b.availableCount,
      coverPath: b.coverPath,
      deletedAt: b.deletedAt,
      createdAt: b.createdAt,
      genres: genresByBookId.get(b.id) ?? [],
      averageRating: ratingByBookId.get(b.id) ?? null,
    }));

    return { data, authors, total };
  }

  async findBookById(id: string): Promise<BookRecordWithDetails | null> {
    const [book] = await this.db
      .select()
      .from(books)
      .where(and(eq(books.id, id), isNull(books.deletedAt)));

    if (!book) {
      return null;
    }

    const bookGenreRows = await this.db
      .select({
        id: genres.id,
        name: genres.name,
        status: genres.status,
      })
      .from(bookGenres)
      .innerJoin(genres, eq(bookGenres.genreId, genres.id))
      .where(eq(bookGenres.bookId, id))
      .orderBy(asc(genres.name));

    const [ratingRow] = await this.db
      .select({
        avgRating: sql<number>`round(avg(${ratings.score})::numeric, 1)::float`,
      })
      .from(ratings)
      .where(eq(ratings.bookId, id));

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      publicationYear: book.publicationYear,
      synopsis: book.synopsis,
      availableCount: book.availableCount,
      coverPath: book.coverPath,
      deletedAt: book.deletedAt,
      createdAt: book.createdAt,
      genres: bookGenreRows,
      averageRating:
        ratingRow?.avgRating !== undefined && ratingRow.avgRating !== null
          ? Number(ratingRow.avgRating)
          : null,
    };
  }

  async createBook(params: CreateBookParams): Promise<{ id: string }> {
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(books)
        .values({
          title: params.title,
          author: params.author,
          publisher: params.publisher,
          publicationYear: params.publicationYear,
          synopsis: params.synopsis,
          availableCount: params.availableCount,
          coverPath: params.coverPath,
          createdAt: params.createdAt,
        })
        .returning({ id: books.id });

      if (!inserted) {
        throw new Error('Gagal menyimpan data buku.');
      }

      if (params.genreIds.length > 0) {
        await tx.insert(bookGenres).values(
          params.genreIds.map((genreId) => ({
            bookId: inserted.id,
            genreId,
          })),
        );
      }

      return { id: inserted.id };
    });
  }

  async updateBook(id: string, params: UpdateBookParams): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.id, id), isNull(books.deletedAt)));

      if (!existing) {
        return false;
      }

      const updateValues: Partial<typeof books.$inferInsert> = {
        title: params.title,
        author: params.author,
        publisher: params.publisher,
        publicationYear: params.publicationYear,
        synopsis: params.synopsis,
        availableCount: params.availableCount,
      };

      if (params.coverPath !== undefined) {
        updateValues.coverPath = params.coverPath;
      }

      await tx.update(books).set(updateValues).where(eq(books.id, id));

      await tx.delete(bookGenres).where(eq(bookGenres.bookId, id));

      if (params.genreIds.length > 0) {
        await tx.insert(bookGenres).values(
          params.genreIds.map((genreId) => ({
            bookId: id,
            genreId,
          })),
        );
      }

      return true;
    });
  }

  async deleteBook(
    id: string,
    now: Date,
  ): Promise<'deleted' | 'not_found' | 'has_active_loans'> {
    return this.db.transaction(async (tx) => {
      const [book] = await tx
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.id, id), isNull(books.deletedAt)));

      if (!book) {
        return 'not_found';
      }

      const activeLoans = await tx
        .select({ id: loans.id })
        .from(loans)
        .where(and(eq(loans.bookId, id), ne(loans.status, 'RETURNED')))
        .limit(1);

      if (activeLoans.length > 0) {
        return 'has_active_loans';
      }

      await tx.update(books).set({ deletedAt: now }).where(eq(books.id, id));

      return 'deleted';
    });
  }

  async listAdminGenres(
    options: ListAdminGenresOptions,
  ): Promise<PaginatedResponse<AdminGenreItem>> {
    const page = Math.max(1, options.page);
    const limit = Math.min(50, Math.max(1, options.limit));
    const offset = (page - 1) * limit;

    const trimmedQ = options.q?.trim();
    const searchFilter =
      trimmedQ && trimmedQ.length > 0
        ? sql`lower(${genres.name}) LIKE ${`%${trimmedQ.toLowerCase()}%`}`
        : undefined;

    const countQuery = this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(genres);
    if (searchFilter) {
      countQuery.where(searchFilter);
    }
    const countResult = await countQuery;
    const total = countResult[0]?.total ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    if (total === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const bookCountSql = sql<number>`COALESCE((
      SELECT count(DISTINCT bg.book_id)::int
      FROM book_genres bg
      INNER JOIN books b ON b.id = bg.book_id
      WHERE bg.genre_id = ${genres.id}
        AND b.deleted_at IS NULL
    ), 0)`;

    const itemsQuery = this.db
      .select({
        id: genres.id,
        name: genres.name,
        status: genres.status,
        bookCount: bookCountSql,
      })
      .from(genres)
      .orderBy(asc(genres.name))
      .limit(limit)
      .offset(offset);

    if (searchFilter) {
      itemsQuery.where(searchFilter);
    }

    const rows = await itemsQuery;

    const data: AdminGenreItem[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      book_count: Number(r.bookCount ?? 0),
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findGenreByName(
    name: string,
    excludeId?: string | undefined,
  ): Promise<GenreRecord | null> {
    const trimmed = name.trim().toLowerCase();
    const conditions = [sql`lower(btrim(${genres.name})) = ${trimmed}`];
    if (excludeId) {
      conditions.push(sql`${genres.id} != ${excludeId}`);
    }

    const rows = await this.db
      .select({
        id: genres.id,
        name: genres.name,
        status: genres.status,
        createdAt: genres.createdAt,
      })
      .from(genres)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  }

  async getGenreById(id: string): Promise<GenreRecord | null> {
    const rows = await this.db
      .select({
        id: genres.id,
        name: genres.name,
        status: genres.status,
        createdAt: genres.createdAt,
      })
      .from(genres)
      .where(eq(genres.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  async createGenre(data: {
    name: string;
    status?: GenreStatus | undefined;
  }): Promise<GenreRecord> {
    const trimmedName = data.name.trim();
    try {
      const rows = await this.db
        .insert(genres)
        .values({
          name: trimmedName,
          status: data.status ?? 'active',
        })
        .returning({
          id: genres.id,
          name: genres.name,
          status: genres.status,
          createdAt: genres.createdAt,
        });

      const created = rows[0];
      if (!created) {
        throw new Error('Failed to insert genre');
      }
      return created;
    } catch (err: unknown) {
      if (isPostgresUniqueViolation(err)) {
        throw createConflictError(API_MESSAGES.GENRE_ALREADY_EXISTS, 'name');
      }
      throw err;
    }
  }

  async updateGenre(
    id: string,
    data: { name?: string | undefined; status?: GenreStatus | undefined },
  ): Promise<GenreRecord> {
    const updateValues: Partial<{ name: string; status: GenreStatus }> = {};
    if (data.name !== undefined) {
      updateValues.name = data.name.trim();
    }
    if (data.status !== undefined) {
      updateValues.status = data.status;
    }

    try {
      const rows = await this.db
        .update(genres)
        .set(updateValues)
        .where(eq(genres.id, id))
        .returning({
          id: genres.id,
          name: genres.name,
          status: genres.status,
          createdAt: genres.createdAt,
        });

      const updated = rows[0];
      if (!updated) {
        throw createNotFoundError('Genre tidak ditemukan.');
      }
      return updated;
    } catch (err: unknown) {
      if (isPostgresUniqueViolation(err)) {
        throw createConflictError(API_MESSAGES.GENRE_ALREADY_EXISTS, 'name');
      }
      throw err;
    }
  }

  async isGenreInUse(id: string): Promise<boolean> {
    const bookRelation = await this.db
      .select({ bookId: bookGenres.bookId })
      .from(bookGenres)
      .where(eq(bookGenres.genreId, id))
      .limit(1);

    if (bookRelation.length > 0) {
      return true;
    }

    const userRelation = await this.db
      .select({ userId: userGenres.userId })
      .from(userGenres)
      .where(eq(userGenres.genreId, id))
      .limit(1);

    return userRelation.length > 0;
  }

  async deleteGenre(id: string): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        const genreRows = await tx
          .select({ id: genres.id })
          .from(genres)
          .where(eq(genres.id, id))
          .limit(1);

        if (genreRows.length === 0) {
          throw createNotFoundError('Genre tidak ditemukan.');
        }

        const bookRel = await tx
          .select({ bookId: bookGenres.bookId })
          .from(bookGenres)
          .where(eq(bookGenres.genreId, id))
          .limit(1);

        if (bookRel.length > 0) {
          throw createGenreInUseError();
        }

        const userRel = await tx
          .select({ userId: userGenres.userId })
          .from(userGenres)
          .where(eq(userGenres.genreId, id))
          .limit(1);

        if (userRel.length > 0) {
          throw createGenreInUseError();
        }

        await tx.delete(genres).where(eq(genres.id, id));
      });
    } catch (err: unknown) {
      if (isPostgresForeignKeyViolation(err)) {
        throw createGenreInUseError();
      }
      throw err;
    }
  }
}

const DEFAULT_IN_MEMORY_GENRES: GenreSeedRecord[] = [
  { id: QA_IDS.genres.bisnis, name: 'Bisnis', status: 'active' },
  { id: QA_IDS.genres.fiksi, name: 'Fiksi', status: 'active' },
  { id: QA_IDS.genres.sejarah, name: 'Sejarah', status: 'active' },
  { id: QA_IDS.genres.teknologi, name: 'Teknologi', status: 'active' },
  { id: QA_IDS.genres.sains, name: 'Sains', status: 'inactive' },
  {
    id: QA_IDS.genres.unused,
    name: 'Puisi Klasik',
    status: 'active',
  },
  {
    id: QA_IDS.genres.inactive,
    name: 'Ensiklopedia Lama',
    status: 'inactive',
  },
];

interface InMemoryBookRecord {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  synopsis: string;
  availableCount: number;
  coverPath: string | null;
  deletedAt: Date | null;
  createdAt: Date;
}

const DEFAULT_IN_MEMORY_BOOKS: InMemoryBookRecord[] = [
  {
    id: QA_IDS.books.bookA,
    title: 'Bumi Manusia',
    author: 'Pramoedya Ananta Toer',
    publisher: 'Lentera Dipantara',
    publicationYear: 1980,
    synopsis:
      'Roman sejarah perjuangan Minke pada masa kolonial Hindia Belanda.',
    availableCount: 3,
    coverPath: 'bumi-manusia.jpg',
    deletedAt: null,
    createdAt: new Date('2026-11-01T00:00:00Z'),
  },
  {
    id: QA_IDS.books.bookB,
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    publicationYear: 2017,
    synopsis:
      'Panduan merancang struktur perangkat lunak yang mudah dipelihara.',
    availableCount: 2,
    coverPath: 'clean-arch.jpg',
    deletedAt: null,
    createdAt: new Date('2026-11-02T00:00:00Z'),
  },
  {
    id: QA_IDS.books.bookC,
    title: 'Filosofi Teras',
    author: 'Henry Manampiring',
    publisher: 'Kompas',
    publicationYear: 2018,
    synopsis: 'Penerapan filsafat Stoa untuk ketenangan mental sehari-hari.',
    availableCount: 4,
    coverPath: null,
    deletedAt: null,
    createdAt: new Date('2026-11-03T00:00:00Z'),
  },
  {
    id: QA_IDS.books.bookD,
    title: 'Sapiens: Riwayat Singkat Umat Manusia',
    author: 'Yuval Noah Harari',
    publisher: 'KPG',
    publicationYear: 2014,
    synopsis: 'Perjalanan sejarah evolusi dan peradaban manusia.',
    availableCount: 1,
    coverPath: null,
    deletedAt: null,
    createdAt: new Date('2026-11-04T00:00:00Z'),
  },
  {
    id: QA_IDS.books.bookE,
    title: 'Laut Bercerita',
    author: 'Leila S. Chudori',
    publisher: 'KPG',
    publicationYear: 2017,
    synopsis:
      'Kisah persahabatan, cinta, keluarga, dan kehilangan para aktivis 1998.',
    availableCount: 0,
    coverPath: null,
    deletedAt: null,
    createdAt: new Date('2026-11-05T00:00:00Z'),
  },
];

const DEFAULT_IN_MEMORY_BOOK_GENRES: Array<{
  bookId: string;
  genreId: string;
}> = [
  { bookId: QA_IDS.books.bookA, genreId: QA_IDS.genres.fiksi },
  { bookId: QA_IDS.books.bookA, genreId: QA_IDS.genres.sejarah },
  { bookId: QA_IDS.books.bookB, genreId: QA_IDS.genres.teknologi },
  { bookId: QA_IDS.books.bookC, genreId: QA_IDS.genres.bisnis },
  { bookId: QA_IDS.books.bookD, genreId: QA_IDS.genres.sejarah },
  { bookId: QA_IDS.books.bookE, genreId: QA_IDS.genres.fiksi },
];

interface InMemoryLoanRecord {
  id: string;
  bookId: string;
  status: string;
}

const DEFAULT_IN_MEMORY_LOANS: InMemoryLoanRecord[] = [
  {
    id: QA_IDS.loans.pending,
    bookId: QA_IDS.books.bookA,
    status: 'PENDING',
  },
  {
    id: QA_IDS.loans.returnedOn,
    bookId: QA_IDS.books.bookB,
    status: 'RETURNED',
  },
];

interface InMemoryRatingRecord {
  bookId: string;
  score: number;
}

const DEFAULT_IN_MEMORY_RATINGS: InMemoryRatingRecord[] = [
  { bookId: QA_IDS.books.bookA, score: 5 },
  { bookId: QA_IDS.books.bookA, score: 4 },
  { bookId: QA_IDS.books.bookB, score: 4 },
];

export interface InMemUserGenre {
  userId: string;
  genreId: string;
}

const DEFAULT_IN_MEMORY_USER_GENRES: InMemUserGenre[] = [
  { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.fiksi },
  { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.teknologi },
  { userId: QA_IDS.users.member2, genreId: QA_IDS.genres.sejarah },
];

export class InMemoryBooksRepository implements BooksRepository {
  private readonly genreRecords: GenreRecord[];
  private readonly bookRecords: InMemoryBookRecord[];
  private readonly bookGenreRecords: Array<{
    bookId: string;
    genreId: string;
  }>;
  private readonly loanRecords: InMemoryLoanRecord[];
  private readonly ratingRecords: InMemoryRatingRecord[];
  private readonly userGenreRecords: InMemUserGenre[];

  constructor(
    initialGenres: Array<
      GenreSeedRecord | GenreRecord
    > = DEFAULT_IN_MEMORY_GENRES,
    initialBooks: InMemoryBookRecord[] = DEFAULT_IN_MEMORY_BOOKS,
    initialBookGenres: Array<{
      bookId: string;
      genreId: string;
    }> = DEFAULT_IN_MEMORY_BOOK_GENRES,
    initialLoans: InMemoryLoanRecord[] = DEFAULT_IN_MEMORY_LOANS,
    initialRatings: InMemoryRatingRecord[] = DEFAULT_IN_MEMORY_RATINGS,
    initialUserGenres: InMemUserGenre[] = DEFAULT_IN_MEMORY_USER_GENRES,
  ) {
    this.genreRecords = initialGenres.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      createdAt: 'createdAt' in item ? item.createdAt : new Date(),
    }));
    this.bookRecords = initialBooks.map((item) => ({ ...item }));
    this.bookGenreRecords = initialBookGenres.map((item) => ({ ...item }));
    this.loanRecords = initialLoans.map((item) => ({ ...item }));
    this.ratingRecords = initialRatings.map((item) => ({ ...item }));
    this.userGenreRecords = initialUserGenres.map((item) => ({ ...item }));
  }

  async listActiveGenres(): Promise<GenreItem[]> {
    return this.genreRecords
      .filter((genre) => genre.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));
  }

  async findActiveGenreIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const lookup = new Set(ids.map((id) => id.toLowerCase()));
    return this.genreRecords
      .filter(
        (genre) =>
          genre.status === 'active' && lookup.has(genre.id.toLowerCase()),
      )
      .map((genre) => genre.id.toLowerCase());
  }

  async findAllGenresByIds(
    ids: string[],
  ): Promise<Array<{ id: string; name: string; status: GenreStatus }>> {
    if (ids.length === 0) {
      return [];
    }

    const lookup = new Set(ids.map((id) => id.toLowerCase()));
    return this.genreRecords
      .filter((genre) => lookup.has(genre.id.toLowerCase()))
      .map(({ id, name, status }) => ({ id, name, status }));
  }

  async listAdminBooks(params: AdminBooksQueryParams): Promise<{
    data: BookRecordWithDetails[];
    authors: string[];
    total: number;
  }> {
    const nonDeletedBooks = this.bookRecords.filter(
      (b) => b.deletedAt === null,
    );

    const authors = Array.from(
      new Set(nonDeletedBooks.map((b) => b.author)),
    ).sort((a, b) => a.localeCompare(b));

    const genreLookup = new Map<string, GenreSeedRecord>();
    for (const g of this.genreRecords) {
      genreLookup.set(g.id.toLowerCase(), g);
    }

    let filtered = nonDeletedBooks;

    if (params.author && params.author.trim().length > 0) {
      const authorFilter = params.author.trim().toLowerCase();
      filtered = filtered.filter(
        (b) => b.author.toLowerCase() === authorFilter,
      );
    }

    if (params.genre && params.genre.trim().length > 0) {
      const targetGenreId = params.genre.trim().toLowerCase();
      filtered = filtered.filter((b) =>
        this.bookGenreRecords.some(
          (bg) =>
            bg.bookId === b.id && bg.genreId.toLowerCase() === targetGenreId,
        ),
      );
    }

    if (params.q && params.q.trim().length > 0) {
      const qLower = params.q.trim().toLowerCase();
      filtered = filtered.filter((b) => {
        const titleMatch = b.title.toLowerCase().includes(qLower);
        const authorMatch = b.author.toLowerCase().includes(qLower);
        const genreMatch = this.bookGenreRecords.some((bg) => {
          if (bg.bookId !== b.id) return false;
          const g = genreLookup.get(bg.genreId.toLowerCase());
          return g ? g.name.toLowerCase().includes(qLower) : false;
        });

        return titleMatch || authorMatch || genreMatch;
      });
    }

    filtered.sort((a, b) => {
      const diff = b.createdAt.getTime() - a.createdAt.getTime();
      return diff !== 0 ? diff : b.id.localeCompare(a.id);
    });

    const total = filtered.length;
    const startIndex = (params.page - 1) * params.limit;
    const pagedBooks = filtered.slice(startIndex, startIndex + params.limit);

    const data: BookRecordWithDetails[] = pagedBooks.map((book) => {
      const bookGenresList = this.bookGenreRecords
        .filter((bg) => bg.bookId === book.id)
        .map((bg) => {
          const g = genreLookup.get(bg.genreId.toLowerCase());
          return {
            id: bg.genreId,
            name: g?.name ?? 'Unknown',
            status: g?.status ?? 'active',
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      const bookRatings = this.ratingRecords.filter(
        (r) => r.bookId === book.id,
      );
      const avg =
        bookRatings.length > 0
          ? Number(
              (
                bookRatings.reduce((sum, r) => sum + r.score, 0) /
                bookRatings.length
              ).toFixed(1),
            )
          : null;

      return {
        ...book,
        genres: bookGenresList,
        averageRating: avg,
      };
    });

    return { data, authors, total };
  }

  async findBookById(id: string): Promise<BookRecordWithDetails | null> {
    const book = this.bookRecords.find(
      (b) => b.id.toLowerCase() === id.toLowerCase() && b.deletedAt === null,
    );
    if (!book) {
      return null;
    }

    const genreLookup = new Map<string, GenreSeedRecord>();
    for (const g of this.genreRecords) {
      genreLookup.set(g.id.toLowerCase(), g);
    }

    const bookGenresList = this.bookGenreRecords
      .filter((bg) => bg.bookId.toLowerCase() === id.toLowerCase())
      .map((bg) => {
        const g = genreLookup.get(bg.genreId.toLowerCase());
        return {
          id: bg.genreId,
          name: g?.name ?? 'Unknown',
          status: g?.status ?? 'active',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const bookRatings = this.ratingRecords.filter(
      (r) => r.bookId.toLowerCase() === id.toLowerCase(),
    );
    const avg =
      bookRatings.length > 0
        ? Number(
            (
              bookRatings.reduce((sum, r) => sum + r.score, 0) /
              bookRatings.length
            ).toFixed(1),
          )
        : null;

    return {
      ...book,
      genres: bookGenresList,
      averageRating: avg,
    };
  }

  async createBook(params: CreateBookParams): Promise<{ id: string }> {
    const newId = crypto.randomUUID();
    const newBook: InMemoryBookRecord = {
      id: newId,
      title: params.title,
      author: params.author,
      publisher: params.publisher,
      publicationYear: params.publicationYear,
      synopsis: params.synopsis,
      availableCount: params.availableCount,
      coverPath: params.coverPath,
      deletedAt: null,
      createdAt: params.createdAt,
    };

    this.bookRecords.push(newBook);
    for (const gid of params.genreIds) {
      this.bookGenreRecords.push({ bookId: newId, genreId: gid });
    }

    return { id: newId };
  }

  async updateBook(id: string, params: UpdateBookParams): Promise<boolean> {
    const book = this.bookRecords.find(
      (b) => b.id.toLowerCase() === id.toLowerCase() && b.deletedAt === null,
    );
    if (!book) {
      return false;
    }

    book.title = params.title;
    book.author = params.author;
    book.publisher = params.publisher;
    book.publicationYear = params.publicationYear;
    book.synopsis = params.synopsis;
    book.availableCount = params.availableCount;
    if (params.coverPath !== undefined) {
      book.coverPath = params.coverPath;
    }

    for (let i = this.bookGenreRecords.length - 1; i >= 0; i--) {
      if (this.bookGenreRecords[i].bookId.toLowerCase() === id.toLowerCase()) {
        this.bookGenreRecords.splice(i, 1);
      }
    }

    for (const gid of params.genreIds) {
      this.bookGenreRecords.push({ bookId: book.id, genreId: gid });
    }

    return true;
  }

  async deleteBook(
    id: string,
    now: Date,
  ): Promise<'deleted' | 'not_found' | 'has_active_loans'> {
    const book = this.bookRecords.find(
      (b) => b.id.toLowerCase() === id.toLowerCase() && b.deletedAt === null,
    );
    if (!book) {
      return 'not_found';
    }

    const hasActive = this.loanRecords.some(
      (l) =>
        l.bookId.toLowerCase() === id.toLowerCase() && l.status !== 'RETURNED',
    );
    if (hasActive) {
      return 'has_active_loans';
    }

    book.deletedAt = now;
    return 'deleted';
  }

  async listAdminGenres(
    options: ListAdminGenresOptions,
  ): Promise<PaginatedResponse<AdminGenreItem>> {
    const page = Math.max(1, options.page);
    const limit = Math.min(50, Math.max(1, options.limit));
    const trimmedQ = options.q?.trim().toLowerCase();

    let filtered = [...this.genreRecords];
    if (trimmedQ && trimmedQ.length > 0) {
      filtered = filtered.filter((genre) =>
        genre.name.toLowerCase().includes(trimmedQ),
      );
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedRecords = filtered.slice(offset, offset + limit);

    const activeBookIdSet = new Set(
      this.bookRecords
        .filter((b) => !b.deletedAt)
        .map((b) => b.id.toLowerCase()),
    );

    const data: AdminGenreItem[] = paginatedRecords.map((genre) => {
      const distinctBooks = new Set<string>();
      for (const rel of this.bookGenreRecords) {
        if (rel.genreId.toLowerCase() === genre.id.toLowerCase()) {
          if (activeBookIdSet.has(rel.bookId.toLowerCase())) {
            distinctBooks.add(rel.bookId.toLowerCase());
          }
        }
      }
      return {
        id: genre.id,
        name: genre.name,
        status: genre.status,
        book_count: distinctBooks.size,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findGenreByName(
    name: string,
    excludeId?: string | undefined,
  ): Promise<GenreRecord | null> {
    const trimmed = name.trim().toLowerCase();
    const found = this.genreRecords.find((genre) => {
      if (excludeId && genre.id.toLowerCase() === excludeId.toLowerCase()) {
        return false;
      }
      return genre.name.trim().toLowerCase() === trimmed;
    });
    return found ? { ...found } : null;
  }

  async getGenreById(id: string): Promise<GenreRecord | null> {
    const found = this.genreRecords.find(
      (genre) => genre.id.toLowerCase() === id.toLowerCase(),
    );
    return found ? { ...found } : null;
  }

  async createGenre(data: {
    name: string;
    status?: GenreStatus | undefined;
  }): Promise<GenreRecord> {
    const trimmed = data.name.trim();
    const duplicate = await this.findGenreByName(trimmed);
    if (duplicate) {
      throw createConflictError(API_MESSAGES.GENRE_ALREADY_EXISTS, 'name');
    }

    const newRecord: GenreRecord = {
      id: crypto.randomUUID(),
      name: trimmed,
      status: data.status ?? 'active',
      createdAt: new Date(),
    };
    this.genreRecords.push(newRecord);
    return { ...newRecord };
  }

  async updateGenre(
    id: string,
    data: { name?: string | undefined; status?: GenreStatus | undefined },
  ): Promise<GenreRecord> {
    const index = this.genreRecords.findIndex(
      (genre) => genre.id.toLowerCase() === id.toLowerCase(),
    );
    if (index === -1) {
      throw createNotFoundError('Genre tidak ditemukan.');
    }

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      const duplicate = await this.findGenreByName(trimmed, id);
      if (duplicate) {
        throw createConflictError(API_MESSAGES.GENRE_ALREADY_EXISTS, 'name');
      }
      this.genreRecords[index].name = trimmed;
    }

    if (data.status !== undefined) {
      this.genreRecords[index].status = data.status;
    }

    return { ...this.genreRecords[index] };
  }

  async isGenreInUse(id: string): Promise<boolean> {
    const idLower = id.toLowerCase();
    const inBooks = this.bookGenreRecords.some(
      (rel) => rel.genreId.toLowerCase() === idLower,
    );
    if (inBooks) {
      return true;
    }

    return this.userGenreRecords.some(
      (rel) => rel.genreId.toLowerCase() === idLower,
    );
  }

  async deleteGenre(id: string): Promise<void> {
    const index = this.genreRecords.findIndex(
      (genre) => genre.id.toLowerCase() === id.toLowerCase(),
    );
    if (index === -1) {
      throw createNotFoundError('Genre tidak ditemukan.');
    }

    if (await this.isGenreInUse(id)) {
      throw createGenreInUseError();
    }

    this.genreRecords.splice(index, 1);
  }
}
