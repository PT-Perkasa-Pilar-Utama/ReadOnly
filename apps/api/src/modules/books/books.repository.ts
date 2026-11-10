import {
  bookGenres,
  books,
  type Database,
  genres,
  loans,
  QA_IDS,
  ratings,
} from '@readonly/db';
import type { GenreItem, GenreStatus } from '@readonly/shared';
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

export interface GenreSeedRecord {
  id: string;
  name: string;
  status: GenreStatus;
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

    const genreRows = await this.db
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

    const genreMap = new Map<
      string,
      Array<{ id: string; name: string; status: GenreStatus }>
    >();
    for (const row of genreRows) {
      const list = genreMap.get(row.bookId) ?? [];
      list.push({
        id: row.genreId,
        name: row.genreName,
        status: row.genreStatus,
      });
      genreMap.set(row.bookId, list);
    }

    const ratingRows = await this.db
      .select({
        bookId: ratings.bookId,
        avgRating: sql<number>`round(avg(${ratings.score})::numeric, 1)::float`,
      })
      .from(ratings)
      .where(inArray(ratings.bookId, bookIds))
      .groupBy(ratings.bookId);

    const ratingMap = new Map<string, number>();
    for (const r of ratingRows) {
      ratingMap.set(r.bookId, Number(r.avgRating));
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
      genres: genreMap.get(b.id) ?? [],
      averageRating: ratingMap.get(b.id) ?? null,
    }));

    return { data, authors, total };
  }

  async findBookById(id: string): Promise<BookRecordWithDetails | null> {
    const [bookRow] = await this.db
      .select()
      .from(books)
      .where(and(eq(books.id, id), isNull(books.deletedAt)));

    if (!bookRow) {
      return null;
    }

    const genreRows = await this.db
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
      id: bookRow.id,
      title: bookRow.title,
      author: bookRow.author,
      publisher: bookRow.publisher,
      publicationYear: bookRow.publicationYear,
      synopsis: bookRow.synopsis,
      availableCount: bookRow.availableCount,
      coverPath: bookRow.coverPath,
      deletedAt: bookRow.deletedAt,
      createdAt: bookRow.createdAt,
      genres: genreRows,
      averageRating: ratingRow ? Number(ratingRow.avgRating) : null,
    };
  }

  async createBook(params: CreateBookParams): Promise<{ id: string }> {
    return this.db.transaction(async (tx) => {
      const [newBook] = await tx
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

      if (params.genreIds.length > 0) {
        await tx.insert(bookGenres).values(
          params.genreIds.map((genreId) => ({
            bookId: newBook.id,
            genreId,
          })),
        );
      }

      return { id: newBook.id };
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

      const updateValues: Record<string, unknown> = {
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
      const [bookRow] = await tx
        .select({ id: books.id })
        .from(books)
        .where(and(eq(books.id, id), isNull(books.deletedAt)));

      if (!bookRow) {
        return 'not_found';
      }

      // AC-05.09 & Q-11: reject deletion if loans with status <> 'RETURNED' exist
      const [activeLoan] = await tx
        .select({ id: loans.id })
        .from(loans)
        .where(and(eq(loans.bookId, id), ne(loans.status, 'RETURNED')))
        .limit(1);

      if (activeLoan) {
        return 'has_active_loans';
      }

      await tx.update(books).set({ deletedAt: now }).where(eq(books.id, id));

      return 'deleted';
    });
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

interface InMemoryLoanRecord {
  id: string;
  bookId: string;
  status: string;
}

interface InMemoryRatingRecord {
  bookId: string;
  score: number;
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

const DEFAULT_IN_MEMORY_RATINGS: InMemoryRatingRecord[] = [
  { bookId: QA_IDS.books.bookA, score: 5 },
  { bookId: QA_IDS.books.bookA, score: 4 },
  { bookId: QA_IDS.books.bookB, score: 4 },
];

export class InMemoryBooksRepository implements BooksRepository {
  private readonly genreRecords: GenreSeedRecord[];
  private readonly bookRecords: InMemoryBookRecord[];
  private readonly bookGenreRecords: Array<{
    bookId: string;
    genreId: string;
  }>;
  private readonly loanRecords: InMemoryLoanRecord[];
  private readonly ratingRecords: InMemoryRatingRecord[];

  constructor(
    initialGenres: GenreSeedRecord[] = DEFAULT_IN_MEMORY_GENRES,
    initialBooks: InMemoryBookRecord[] = DEFAULT_IN_MEMORY_BOOKS,
    initialBookGenres: Array<{
      bookId: string;
      genreId: string;
    }> = DEFAULT_IN_MEMORY_BOOK_GENRES,
    initialLoans: InMemoryLoanRecord[] = DEFAULT_IN_MEMORY_LOANS,
    initialRatings: InMemoryRatingRecord[] = DEFAULT_IN_MEMORY_RATINGS,
  ) {
    this.genreRecords = initialGenres.map((item) => ({ ...item }));
    this.bookRecords = initialBooks.map((item) => ({ ...item }));
    this.bookGenreRecords = initialBookGenres.map((item) => ({ ...item }));
    this.loanRecords = initialLoans.map((item) => ({ ...item }));
    this.ratingRecords = initialRatings.map((item) => ({ ...item }));
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
      .map((genre) => ({
        id: genre.id,
        name: genre.name,
        status: genre.status,
      }));
  }

  async listAdminBooks(params: AdminBooksQueryParams): Promise<{
    data: BookRecordWithDetails[];
    authors: string[];
    total: number;
  }> {
    const activeBooks = this.bookRecords.filter(
      (b) => b.deletedAt === null || b.deletedAt === undefined,
    );

    const authors = Array.from(new Set(activeBooks.map((b) => b.author))).sort(
      (a, b) => a.localeCompare(b),
    );

    const genreLookup = new Map<string, GenreSeedRecord>();
    for (const g of this.genreRecords) {
      genreLookup.set(g.id.toLowerCase(), g);
    }

    const filtered = activeBooks.filter((book) => {
      if (params.author && params.author.trim().length > 0) {
        if (book.author.toLowerCase() !== params.author.trim().toLowerCase()) {
          return false;
        }
      }

      if (params.genre && params.genre.trim().length > 0) {
        const targetGenreId = params.genre.trim().toLowerCase();
        const hasGenre = this.bookGenreRecords.some(
          (bg) =>
            bg.bookId === book.id && bg.genreId.toLowerCase() === targetGenreId,
        );
        if (!hasGenre) {
          return false;
        }
      }

      if (params.q && params.q.trim().length > 0) {
        const query = params.q.trim().toLowerCase();
        const titleMatch = book.title.toLowerCase().includes(query);
        const authorMatch = book.author.toLowerCase().includes(query);

        const bookGids = this.bookGenreRecords
          .filter((bg) => bg.bookId === book.id)
          .map((bg) => bg.genreId.toLowerCase());
        const genreMatch = bookGids.some((gid) => {
          const g = genreLookup.get(gid);
          return g ? g.name.toLowerCase().includes(query) : false;
        });

        if (!titleMatch && !authorMatch && !genreMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort createdAt DESC, id DESC
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

    // Remove existing book_genres
    for (let i = this.bookGenreRecords.length - 1; i >= 0; i--) {
      if (this.bookGenreRecords[i].bookId.toLowerCase() === id.toLowerCase()) {
        this.bookGenreRecords.splice(i, 1);
      }
    }

    // Add updated genreIds
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

    // Check active loans
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
}
