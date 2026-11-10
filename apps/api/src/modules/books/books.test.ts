import { describe, expect, it } from 'bun:test';
import { Buffer } from 'node:buffer';
import { type Database, QA_IDS } from '@readonly/db';
import { API_MESSAGES } from '@readonly/shared';
import { createApp } from '../../app';
import { MemoryStorageAdapter } from '../../ports/storage';
import {
  DrizzleBooksRepository,
  InMemoryBooksRepository,
} from './books.repository';
import { BooksService } from './books.service';

function createPngBuffer(size = 100): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(Math.max(8, size));
  const u8 = new Uint8Array(ab);
  u8.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return u8;
}

function createJpegBuffer(size = 100): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(Math.max(3, size));
  const u8 = new Uint8Array(ab);
  u8.set([0xff, 0xd8, 0xff], 0);
  return u8;
}

interface TestHarness {
  app: ReturnType<typeof createApp>;
  storagePort: MemoryStorageAdapter;
  booksRepository: InMemoryBooksRepository;
  getAdminHeaders: () => Promise<Record<string, string>>;
  getMemberHeaders: () => Promise<Record<string, string>>;
}

function createTestHarness(
  repoCustomizer?: (repo: InMemoryBooksRepository) => void,
): TestHarness {
  const storagePort = new MemoryStorageAdapter();
  const booksRepository = new InMemoryBooksRepository();
  if (repoCustomizer) {
    repoCustomizer(booksRepository);
  }
  const booksService = new BooksService({
    repository: booksRepository,
    storage: storagePort,
  });

  const app = createApp({
    booksRepository,
    booksService,
    storagePort,
    bcryptSaltRounds: 4,
  });

  let cachedAdminHeaders: Record<string, string> | null = null;
  let cachedMemberHeaders: Record<string, string> | null = null;

  const getAdminHeaders = async () => {
    if (cachedAdminHeaders) {
      return cachedAdminHeaders;
    }
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { token: string } };
    cachedAdminHeaders = {
      cookie: `readonly_session=${body.data.token}`,
    };
    return cachedAdminHeaders;
  };

  const getMemberHeaders = async () => {
    if (cachedMemberHeaders) {
      return cachedMemberHeaders;
    }
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'member1@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { token: string } };
    cachedMemberHeaders = {
      cookie: `readonly_session=${body.data.token}`,
    };
    return cachedMemberHeaders;
  };

  return {
    app,
    storagePort,
    booksRepository,
    getAdminHeaders,
    getMemberHeaders,
  };
}

async function getAdminSessionCookie(
  app: ReturnType<typeof createApp>,
): Promise<string> {
  const loginRes = await app.handle(
    new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@readonly.ppu.co.id',
        password: 'password123',
      }),
    }),
  );
  expect(loginRes.status).toBe(200);
  const cookie = loginRes.headers.get('set-cookie') ?? '';
  expect(cookie).toContain('readonly_session=');
  return cookie;
}

async function getMemberSessionCookie(
  app: ReturnType<typeof createApp>,
): Promise<string> {
  const loginRes = await app.handle(
    new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'newmember@gmail.com',
        password: 'password',
      }),
    }),
  );
  expect(loginRes.status).toBe(200);
  const cookie = loginRes.headers.get('set-cookie') ?? '';
  expect(cookie).toContain('readonly_session=');
  return cookie;
}

describe('books module - GET /api/v1/genres', () => {
  it('returns only active genres sorted alphabetically and excludes inactive genres (AC-01.07, AC-11.06)', async () => {
    const booksRepository = new InMemoryBooksRepository([
      { id: QA_IDS.genres.teknologi, name: 'Teknologi', status: 'active' },
      { id: QA_IDS.genres.fiksi, name: 'Fiksi', status: 'active' },
      { id: QA_IDS.genres.sains, name: 'Sains', status: 'inactive' },
      {
        id: QA_IDS.genres.inactive,
        name: 'Ensiklopedia Lama',
        status: 'inactive',
      },
    ]);

    const app = createApp({ booksRepository });
    const response = await app.handle(
      new Request('http://localhost/api/v1/genres'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [
        { id: QA_IDS.genres.fiksi, name: 'Fiksi' },
        { id: QA_IDS.genres.teknologi, name: 'Teknologi' },
      ],
    });
  });

  it('returns an empty list when no genres are active', async () => {
    const booksRepository = new InMemoryBooksRepository([
      { id: QA_IDS.genres.sains, name: 'Sains', status: 'inactive' },
    ]);

    const app = createApp({ booksRepository });
    const response = await app.handle(
      new Request('http://localhost/api/v1/genres'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
    });
  });

  it('validates whether all requested genre IDs exist and are active', async () => {
    const repository = new InMemoryBooksRepository([
      { id: QA_IDS.genres.fiksi, name: 'Fiksi', status: 'active' },
      { id: QA_IDS.genres.teknologi, name: 'Teknologi', status: 'active' },
      { id: QA_IDS.genres.sains, name: 'Sains', status: 'inactive' },
    ]);
    const service = new BooksService(repository);

    expect(
      await service.areAllGenresActive([
        QA_IDS.genres.fiksi,
        QA_IDS.genres.teknologi.toUpperCase(),
      ]),
    ).toBe(true);
    expect(
      await service.areAllGenresActive([
        QA_IDS.genres.fiksi,
        QA_IDS.genres.sains,
      ]),
    ).toBe(false);
    expect(await service.areAllGenresActive([])).toBe(false);
  });

  it('short-circuits DrizzleBooksRepository.findActiveGenreIds and findAllGenresByIds on empty input', async () => {
    let queryCalled = false;
    const fakeDb = {
      select() {
        queryCalled = true;
        throw new Error('Should not query database for empty ID list');
      },
    } as unknown as Database;

    const repository = new DrizzleBooksRepository(fakeDb);
    expect(await repository.findActiveGenreIds([])).toEqual([]);
    expect(await repository.findAllGenresByIds([])).toEqual([]);
    expect(queryCalled).toBe(false);
  });
});

describe('Master Buku CRUD (BE-S1-03)', () => {
  it('enforces RBAC on /admin/books endpoints (401 unauthenticated, 403 member)', async () => {
    const { app, getMemberHeaders } = createTestHarness();

    const unauthRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books'),
    );
    expect(unauthRes.status).toBe(401);
    const unauthBody = (await unauthRes.json()) as { code: string };
    expect(unauthBody.code).toBe('session_not_found');

    const memberHeaders = await getMemberHeaders();
    const memberRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books', {
        headers: memberHeaders,
      }),
    );
    expect(memberRes.status).toBe(403);
    const memberBody = (await memberRes.json()) as { code: string };
    expect(memberBody.code).toBe('forbidden');
  });

  it('GET /admin/books lists books with pagination, authors list, genres, and availability (AC-05.07, AC-05.08)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/books?page=1&limit=10', {
        headers: adminHeaders,
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: Array<{
        id: string;
        title: string;
        author: string;
        available_count: number;
        is_available: boolean;
        availability_label: string;
        genres: Array<{ id: string; name: string; status: string }>;
        average_rating: number | null;
      }>;
      authors: string[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };

    expect(body.data.length).toBeGreaterThanOrEqual(5);
    expect(body.pagination.total).toBeGreaterThanOrEqual(5);
    expect(body.pagination.totalPages).toBeGreaterThanOrEqual(1);
    expect(body.authors).toContain('Pramoedya Ananta Toer');
    expect(body.authors).toContain('Robert C. Martin');

    const bookA = body.data.find((b) => b.id === QA_IDS.books.bookA);
    expect(bookA).toBeDefined();
    expect(bookA?.title).toBe('Bumi Manusia');
    expect(bookA?.available_count).toBe(3);
    expect(bookA?.is_available).toBe(true);
    expect(bookA?.availability_label).toBe('Tersedia');
    expect(bookA?.genres.some((g) => g.name === 'Fiksi')).toBe(true);
    expect(bookA?.average_rating).toBe(4.5);

    const bookE = body.data.find((b) => b.id === QA_IDS.books.bookE);
    expect(bookE).toBeDefined();
    expect(bookE?.available_count).toBe(0);
    expect(bookE?.is_available).toBe(false);
    expect(bookE?.availability_label).toBe('Tidak Tersedia');
  });

  it('GET /admin/books filters by author and genre (AC-05.07)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const authorRes = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/books?author=Robert%20C.%20Martin',
        { headers: adminHeaders },
      ),
    );
    expect(authorRes.status).toBe(200);
    const authorBody = (await authorRes.json()) as {
      data: Array<{ title: string; author: string }>;
    };
    expect(authorBody.data.length).toBe(1);
    expect(authorBody.data[0].title).toBe('Clean Architecture');

    const genreRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/books?genre=${QA_IDS.genres.teknologi}`,
        { headers: adminHeaders },
      ),
    );
    expect(genreRes.status).toBe(200);
    const genreBody = (await genreRes.json()) as {
      data: Array<{ title: string }>;
    };
    expect(genreBody.data.some((b) => b.title === 'Clean Architecture')).toBe(
      true,
    );
  });

  it('GET /admin/books searches substring on title, author, or genre name (AC-05.08)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // 1. Search by title
    const titleRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?q=Manusia', {
        headers: adminHeaders,
      }),
    );
    expect(titleRes.status).toBe(200);
    const titleBody = (await titleRes.json()) as {
      data: Array<{ title: string }>;
    };
    expect(titleBody.data.some((b) => b.title === 'Bumi Manusia')).toBe(true);
    expect(
      titleBody.data.some(
        (b) => b.title === 'Sapiens: Riwayat Singkat Umat Manusia',
      ),
    ).toBe(true);

    // 2. Search by author
    const authorRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?q=Pramoedya', {
        headers: adminHeaders,
      }),
    );
    expect(authorRes.status).toBe(200);
    const authorBody = (await authorRes.json()) as {
      data: Array<{ title: string }>;
    };
    expect(authorBody.data.length).toBe(1);
    expect(authorBody.data[0].title).toBe('Bumi Manusia');

    // 3. Search by genre name
    const genreRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?q=Teknologi', {
        headers: adminHeaders,
      }),
    );
    expect(genreRes.status).toBe(200);
    const genreBody = (await genreRes.json()) as {
      data: Array<{ title: string }>;
    };
    expect(genreBody.data.some((b) => b.title === 'Clean Architecture')).toBe(
      true,
    );
  });

  it('GET /admin/books rejects invalid query parameters with 422', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const limitRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?limit=100', {
        headers: adminHeaders,
      }),
    );
    expect(limitRes.status).toBe(422);

    const pageRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?page=0', {
        headers: adminHeaders,
      }),
    );
    expect(pageRes.status).toBe(422);

    const invalidGenreRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?genre=not-a-uuid', {
        headers: adminHeaders,
      }),
    );
    expect(invalidGenreRes.status).toBe(422);
  });

  it('POST /admin/books creates a book with cover and returns 201 (AC-05.01)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const pngBuffer = createPngBuffer(512);
    const formData = new FormData();
    formData.append('title', 'Refactoring');
    formData.append('author', 'Martin Fowler');
    formData.append('publisher', 'Addison-Wesley');
    formData.append('publication_year', '1999');
    formData.append(
      'synopsis',
      'Improving the design of existing code through disciplined techniques.',
    );
    formData.append('available_count', '5');
    formData.append('genre_ids', JSON.stringify([QA_IDS.genres.teknologi]));
    formData.append(
      'cover',
      new File([pngBuffer], 'refactoring.png', { type: 'image/png' }),
    );

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/books', {
        method: 'POST',
        headers: adminHeaders,
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      data: { id: string };
      message: string;
    };
    expect(body.message).toBe('Buku berhasil ditambahkan');
    expect(typeof body.data.id).toBe('string');

    // Verify detail is returned in GET /admin/books
    const listRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?q=Refactoring', {
        headers: adminHeaders,
      }),
    );
    const listBody = (await listRes.json()) as {
      data: Array<{
        id: string;
        title: string;
        available_count: number;
        cover_url: string;
      }>;
    };
    expect(listBody.data.length).toBe(1);
    expect(listBody.data[0].id).toBe(body.data.id);
    expect(listBody.data[0].title).toBe('Refactoring');
    expect(listBody.data[0].available_count).toBe(5);
    expect(listBody.data[0].cover_url).toContain('/api/v1/covers/');

    // Test GET /covers/:filename serves the uploaded cover
    const coverFilename = listBody.data[0].cover_url.split('/').pop() ?? '';
    const coverRes = await app.handle(
      new Request(`http://localhost/api/v1/covers/${coverFilename}`),
    );
    expect(coverRes.status).toBe(200);
    expect(coverRes.headers.get('content-type')).toBe('image/png');
    const downloaded = Buffer.from(await coverRes.arrayBuffer());
    expect(downloaded.length).toBe(pngBuffer.length);
  });

  it('POST /admin/books validates mandatory fields with verbatim AC-05.02 message', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const validCover = new File([createPngBuffer()], 'valid.png', {
      type: 'image/png',
    });

    const createReq = (fields: Record<string, unknown>, cover?: File) => {
      const fd = new FormData();
      for (const [key, val] of Object.entries(fields)) {
        fd.append(key, String(val));
      }
      if (cover) {
        fd.append('cover', cover);
      }
      return new Request('http://localhost/api/v1/admin/books', {
        method: 'POST',
        headers: adminHeaders,
        body: fd,
      });
    };

    const baseValid = {
      title: 'T',
      author: 'A',
      publisher: 'P',
      publication_year: '2024',
      synopsis: 'S',
      available_count: '1',
      genre_ids: JSON.stringify([QA_IDS.genres.teknologi]),
    };

    // 1. Missing title
    const resTitle = await app.handle(
      createReq({ ...baseValid, title: '  ' }, validCover),
    );
    expect(resTitle.status).toBe(422);
    expect(await resTitle.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'title' },
    });

    // 2. Missing author
    const resAuthor = await app.handle(
      createReq({ ...baseValid, author: '' }, validCover),
    );
    expect(resAuthor.status).toBe(422);
    expect(await resAuthor.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'author' },
    });

    // 3. Missing publisher
    const resPub = await app.handle(
      createReq({ ...baseValid, publisher: '' }, validCover),
    );
    expect(resPub.status).toBe(422);
    expect(await resPub.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'publisher' },
    });

    // 4. Missing publication_year
    const resYear = await app.handle(
      createReq({ ...baseValid, publication_year: 'abc' }, validCover),
    );
    expect(resYear.status).toBe(422);
    expect(await resYear.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'publication_year' },
    });

    // 5. Missing synopsis
    const resSyn = await app.handle(
      createReq({ ...baseValid, synopsis: '   ' }, validCover),
    );
    expect(resSyn.status).toBe(422);
    expect(await resSyn.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'synopsis' },
    });

    // 6. Missing available_count
    const resCount = await app.handle(
      createReq({ ...baseValid, available_count: '-1' }, validCover),
    );
    expect(resCount.status).toBe(422);
    expect(await resCount.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'available_count' },
    });

    // 7. Missing genre_ids
    const resGenre = await app.handle(
      createReq({ ...baseValid, genre_ids: '[]' }, validCover),
    );
    expect(resGenre.status).toBe(422);
    expect(await resGenre.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'genre_ids' },
    });

    // 8. Missing cover
    const resCover = await app.handle(createReq(baseValid));
    expect(resCover.status).toBe(422);
    expect(await resCover.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'cover' },
    });
  });

  it('POST /admin/books validates cover format (extension, MIME, magic bytes) (AC-05.03)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const baseValid = {
      title: 'Valid Book',
      author: 'Author',
      publisher: 'Publisher',
      publication_year: '2024',
      synopsis: 'Synopsis',
      available_count: '2',
      genre_ids: JSON.stringify([QA_IDS.genres.teknologi]),
    };

    const submitCover = async (file: File) => {
      const fd = new FormData();
      for (const [key, val] of Object.entries(baseValid)) {
        fd.append(key, String(val));
      }
      fd.append('cover', file);
      return app.handle(
        new Request('http://localhost/api/v1/admin/books', {
          method: 'POST',
          headers: adminHeaders,
          body: fd,
        }),
      );
    };

    // 1. Wrong extension (.txt)
    const txtFile = new File(['just some text'], 'cover.txt', {
      type: 'text/plain',
    });
    const resTxt = await submitCover(txtFile);
    expect(resTxt.status).toBe(422);
    expect(await resTxt.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Format file cover buku tidak sesuai',
      data: { field: 'cover' },
    });

    // 2. Corrupted magic bytes (.png extension but raw text bytes)
    const fakePng = new File(['not really a png'], 'cover.png', {
      type: 'image/png',
    });
    const resFakePng = await submitCover(fakePng);
    expect(resFakePng.status).toBe(422);
    expect(await resFakePng.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Format file cover buku tidak sesuai',
      data: { field: 'cover' },
    });

    // 3. Extension and magic bytes mismatch (JPEG bytes in .png filename)
    const mismatchFile = new File([createJpegBuffer()], 'cover.png', {
      type: 'image/png',
    });
    const resMismatch = await submitCover(mismatchFile);
    expect(resMismatch.status).toBe(422);
    expect(await resMismatch.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Format file cover buku tidak sesuai',
      data: { field: 'cover' },
    });
  });

  it('POST /admin/books validates cover file size exceeds 5 MiB (AC-05.04)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // 5 MiB + 1024 bytes = 5.243.904 bytes
    const oversizedPng = createPngBuffer(5 * 1024 * 1024 + 1024);
    const file = new File([oversizedPng], 'huge.png', { type: 'image/png' });

    const fd = new FormData();
    fd.append('title', 'Big Book');
    fd.append('author', 'Author');
    fd.append('publisher', 'Publisher');
    fd.append('publication_year', '2024');
    fd.append('synopsis', 'Synopsis');
    fd.append('available_count', '2');
    fd.append('genre_ids', JSON.stringify([QA_IDS.genres.teknologi]));
    fd.append('cover', file);

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/books', {
        method: 'POST',
        headers: adminHeaders,
        body: fd,
      }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Ukuran file cover buku tidak boleh lebih dari 5Mb',
      data: { field: 'cover' },
    });
  });

  it('POST /admin/books rejects adding book with inactive genre (AC-05.01, AC-05.10)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const fd = new FormData();
    fd.append('title', 'Book with Inactive Genre');
    fd.append('author', 'Author');
    fd.append('publisher', 'Publisher');
    fd.append('publication_year', '2024');
    fd.append('synopsis', 'Synopsis');
    fd.append('available_count', '2');
    fd.append(
      'genre_ids',
      JSON.stringify([QA_IDS.genres.teknologi, QA_IDS.genres.sains]),
    ); // sains is inactive
    fd.append(
      'cover',
      new File([createPngBuffer()], 'cover.png', { type: 'image/png' }),
    );

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/books', {
        method: 'POST',
        headers: adminHeaders,
        body: fd,
      }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'genre_ids' },
    });
  });

  it('PATCH /admin/books/:id modifies book data and preserves cover when not provided (AC-05.05)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const fd = new FormData();
    fd.append('title', 'Bumi Manusia (Edisi Khusus)');
    fd.append('author', 'Pramoedya Ananta Toer');
    fd.append('publisher', 'Lentera Dipantara');
    fd.append('publication_year', '1982');
    fd.append('synopsis', 'Sinopsis diperbarui.');
    fd.append('available_count', '10');
    fd.append('genre_ids', JSON.stringify([QA_IDS.genres.sejarah]));

    const res = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${QA_IDS.books.bookA}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: fd,
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { id: string };
      message: string;
    };
    expect(body.message).toBe('Buku berhasil diubah');
    expect(body.data.id).toBe(QA_IDS.books.bookA);

    // Verify update reflected in list
    const getRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?q=Edisi%20Khusus', {
        headers: adminHeaders,
      }),
    );
    const getBody = (await getRes.json()) as {
      data: Array<{
        id: string;
        title: string;
        publication_year: number;
        available_count: number;
        cover_url: string;
        genres: Array<{ name: string }>;
      }>;
    };
    expect(getBody.data.length).toBe(1);
    expect(getBody.data[0].title).toBe('Bumi Manusia (Edisi Khusus)');
    expect(getBody.data[0].publication_year).toBe(1982);
    expect(getBody.data[0].available_count).toBe(10);
    expect(getBody.data[0].cover_url).toContain('bumi-manusia.jpg'); // cover preserved
    expect(getBody.data[0].genres.length).toBe(1);
    expect(getBody.data[0].genres[0].name).toBe('Sejarah');
  });

  it('PATCH /admin/books/:id replaces cover when new valid file is uploaded', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const newJpeg = createJpegBuffer(256);
    const fd = new FormData();
    fd.append('title', 'Bumi Manusia');
    fd.append('author', 'Pramoedya Ananta Toer');
    fd.append('publisher', 'Lentera Dipantara');
    fd.append('publication_year', '1980');
    fd.append('synopsis', 'Sinopsis');
    fd.append('available_count', '3');
    fd.append('genre_ids', JSON.stringify([QA_IDS.genres.fiksi]));
    fd.append(
      'cover',
      new File([newJpeg], 'new-cover.jpg', { type: 'image/jpeg' }),
    );

    const res = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${QA_IDS.books.bookA}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: fd,
      }),
    );

    expect(res.status).toBe(200);

    const getRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?q=Bumi%20Manusia', {
        headers: adminHeaders,
      }),
    );
    const getBody = (await getRes.json()) as {
      data: Array<{ cover_url: string }>;
    };
    expect(getBody.data[0].cover_url).not.toContain('bumi-manusia.jpg');
    expect(getBody.data[0].cover_url).toMatch(/\.jpg$/);
  });

  it('PATCH /admin/books/:id allows keeping existing inactive genre, but rejects adding new inactive genre (AC-05.10)', async () => {
    // Setup a book with an existing inactive genre
    const testBookId = '00000000-0000-4000-8002-000000000099';
    const { app, getAdminHeaders } = createTestHarness((repo) => {
      // Add a book that has QA_IDS.genres.inactive ('Ensiklopedia Lama')
      (repo as unknown as { bookRecords: Array<unknown> }).bookRecords.push({
        id: testBookId,
        title: 'Ensiklopedia Nusantara',
        author: 'Tim Penulis',
        publisher: 'Balai Pustaka',
        publicationYear: 1975,
        synopsis: 'Kumpulan pengetahuan lama.',
        availableCount: 1,
        coverPath: null,
        deletedAt: null,
        createdAt: new Date('2026-11-01T00:00:00Z'),
      });
      (
        repo as unknown as {
          bookGenreRecords: Array<{ bookId: string; genreId: string }>;
        }
      ).bookGenreRecords.push({
        bookId: testBookId,
        genreId: QA_IDS.genres.inactive,
      });
    });
    const adminHeaders = await getAdminHeaders();

    // 1. Verify GET /admin/books lists this book and shows status 'inactive' on its genre
    const listRes = await app.handle(
      new Request('http://localhost/api/v1/admin/books?q=Ensiklopedia', {
        headers: adminHeaders,
      }),
    );
    const listBody = (await listRes.json()) as {
      data: Array<{
        genres: Array<{ id: string; name: string; status: string }>;
      }>;
    };
    const targetBook = listBody.data.find((b) =>
      b.genres.some((g) => g.id === QA_IDS.genres.inactive),
    );
    expect(targetBook).toBeDefined();
    const inactiveGenre = targetBook?.genres.find(
      (g) => g.id === QA_IDS.genres.inactive,
    );
    expect(inactiveGenre?.status).toBe('inactive');

    // 2. PATCH keeping the existing inactive genre succeeds! (AC-05.10)
    const patchFd = new FormData();
    patchFd.append('title', 'Ensiklopedia Nusantara (Revisi)');
    patchFd.append('author', 'Tim Penulis');
    patchFd.append('publisher', 'Balai Pustaka');
    patchFd.append('publication_year', '1975');
    patchFd.append('synopsis', 'Kumpulan pengetahuan lama.');
    patchFd.append('available_count', '2');
    patchFd.append(
      'genre_ids',
      JSON.stringify([QA_IDS.genres.inactive, QA_IDS.genres.fiksi]),
    );

    const patchSuccessRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${testBookId}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: patchFd,
      }),
    );
    expect(patchSuccessRes.status).toBe(200);
    const patchSuccessBody = (await patchSuccessRes.json()) as {
      message: string;
    };
    expect(patchSuccessBody.message).toBe('Buku berhasil diubah');

    // 3. PATCH adding a NEW inactive genre (QA_IDS.genres.sains) fails with 422!
    const patchFailFd = new FormData();
    patchFailFd.append('title', 'Ensiklopedia Nusantara (Revisi)');
    patchFailFd.append('author', 'Tim Penulis');
    patchFailFd.append('publisher', 'Balai Pustaka');
    patchFailFd.append('publication_year', '1975');
    patchFailFd.append('synopsis', 'Kumpulan pengetahuan lama.');
    patchFailFd.append('available_count', '2');
    patchFailFd.append(
      'genre_ids',
      JSON.stringify([
        QA_IDS.genres.inactive,
        QA_IDS.genres.sains, // NEW inactive genre!
      ]),
    );

    const patchFailRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${testBookId}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: patchFailFd,
      }),
    );
    expect(patchFailRes.status).toBe(422);
    expect(await patchFailRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'genre_ids' },
    });
  });

  it('PATCH /admin/books/:id rejects blank mandatory fields and non-existent IDs', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // Blank title
    const fdBlank = new FormData();
    fdBlank.append('title', '');
    fdBlank.append('author', 'Author');
    fdBlank.append('publisher', 'Publisher');
    fdBlank.append('publication_year', '2024');
    fdBlank.append('synopsis', 'Synopsis');
    fdBlank.append('available_count', '1');
    fdBlank.append('genre_ids', JSON.stringify([QA_IDS.genres.teknologi]));

    const blankRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${QA_IDS.books.bookA}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: fdBlank,
      }),
    );
    expect(blankRes.status).toBe(422);
    expect(await blankRes.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: 'Field harus diisi!',
      data: { field: 'title' },
    });

    // Non-existent ID
    const fakeId = '00000000-0000-4000-8002-999999999999';
    const validFd = new FormData();
    validFd.append('title', 'T');
    validFd.append('author', 'A');
    validFd.append('publisher', 'P');
    validFd.append('publication_year', '2024');
    validFd.append('synopsis', 'S');
    validFd.append('available_count', '1');
    validFd.append('genre_ids', JSON.stringify([QA_IDS.genres.teknologi]));

    const notFoundRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${fakeId}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: validFd,
      }),
    );
    expect(notFoundRes.status).toBe(404);
  });

  it('DELETE /admin/books/:id rejects deleting book with active loan (AC-05.09, Q-11)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // bookA has loan with status 'PENDING' in initial data
    const res = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${QA_IDS.books.bookA}`, {
        method: 'DELETE',
        headers: adminHeaders,
      }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'forbidden',
      message: 'Buku tidak dapat dihapus karena masih dipinjam',
    });
  });

  it('DELETE /admin/books/:id soft-deletes book when no active loans exist (AC-05.06)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // bookB has only a 'RETURNED' loan
    const deleteRes = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${QA_IDS.books.bookB}`, {
        method: 'DELETE',
        headers: adminHeaders,
      }),
    );

    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.json()).toEqual({
      data: { id: QA_IDS.books.bookB },
      message: 'Buku berhasil dihapus',
    });

    // Verify bookB is excluded from subsequent GET /admin/books
    const listRes = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/books?q=Clean%20Architecture',
        {
          headers: adminHeaders,
        },
      ),
    );
    const listBody = (await listRes.json()) as { data: Array<{ id: string }> };
    expect(listBody.data.length).toBe(0);

    // Deleting again returns 404
    const secondDelete = await app.handle(
      new Request(`http://localhost/api/v1/admin/books/${QA_IDS.books.bookB}`, {
        method: 'DELETE',
        headers: adminHeaders,
      }),
    );
    expect(secondDelete.status).toBe(404);
  });

  it('GET /covers/:filename returns 404 for unknown files and path traversal attempts', async () => {
    const { app } = createTestHarness();

    const notFoundRes = await app.handle(
      new Request('http://localhost/api/v1/covers/non-existent.jpg'),
    );
    expect(notFoundRes.status).toBe(404);

    const traversalRes = await app.handle(
      new Request('http://localhost/api/v1/covers/..%2F..%2Fetc%2Fpasswd'),
    );
    expect(traversalRes.status).toBe(404);
  });

  it('detaches uploaded cover when database creation fails', async () => {
    let detachCalled = false;
    let uploadedFile: string | null = null;

    const fakeStorage: MemoryStorageAdapter = new MemoryStorageAdapter();
    const origUpload = fakeStorage.uploadCover.bind(fakeStorage);
    fakeStorage.uploadCover = async (fn, body) => {
      uploadedFile = fn;
      return origUpload(fn, body);
    };
    fakeStorage.detachCover = async (fn) => {
      detachCalled = true;
      return fakeStorage.detachCover(fn);
    };

    const failingRepo = new InMemoryBooksRepository();
    failingRepo.createBook = async () => {
      throw new Error('Simulated DB crash');
    };

    const app = createApp({
      booksRepository: failingRepo,
      storagePort: fakeStorage,
      bcryptSaltRounds: 4,
    });

    const adminLoginRes = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );
    const adminToken = (
      (await adminLoginRes.json()) as { data: { token: string } }
    ).data.token;

    const fd = new FormData();
    fd.append('title', 'Fail Book');
    fd.append('author', 'Author');
    fd.append('publisher', 'Publisher');
    fd.append('publication_year', '2024');
    fd.append('synopsis', 'Synopsis');
    fd.append('available_count', '2');
    fd.append('genre_ids', JSON.stringify([QA_IDS.genres.teknologi]));
    fd.append(
      'cover',
      new File([createPngBuffer()], 'fail.png', { type: 'image/png' }),
    );

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/books', {
        method: 'POST',
        headers: { cookie: `readonly_session=${adminToken}` },
        body: fd,
      }),
    );

    expect(res.status).toBe(500);
    expect(detachCalled).toBe(true);
    expect(uploadedFile).not.toBeNull();
  });
});

describe('books module - Master Genre CRUD & status (BE-S1-04 / US-11)', () => {
  it('enforces RBAC on Master Genre admin endpoints (SEC-02, SEC-05)', async () => {
    const app = createApp();
    const memberCookie = await getMemberSessionCookie(app);

    // 401 unauthenticated
    const unauthGet = await app.handle(
      new Request('http://localhost/api/v1/admin/genres'),
    );
    expect(unauthGet.status).toBe(401);
    expect((await unauthGet.json()).code).toBe('session_not_found');

    const unauthPost = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Komik' }),
      }),
    );
    expect(unauthPost.status).toBe(401);

    // 403 forbidden for member
    const memberGet = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        headers: { cookie: memberCookie },
      }),
    );
    expect(memberGet.status).toBe(403);
    expect((await memberGet.json()).code).toBe('forbidden');

    const memberPost = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: memberCookie,
        },
        body: JSON.stringify({ name: 'Komik' }),
      }),
    );
    expect(memberPost.status).toBe(403);

    const memberPatch = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.fiksi}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: memberCookie,
          },
          body: JSON.stringify({ name: 'Fiksi Baru' }),
        },
      ),
    );
    expect(memberPatch.status).toBe(403);

    const memberDelete = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.unused}`,
        {
          method: 'DELETE',
          headers: { cookie: memberCookie },
        },
      ),
    );
    expect(memberDelete.status).toBe(403);
  });

  it('AC-11.01: lists all genres with book_count, status, and pagination for admin', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/genres?page=1&limit=10', {
        headers: { cookie: adminCookie },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        status: string;
        book_count: number;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };

    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.total).toBe(7);
    expect(body.pagination.totalPages).toBe(1);
    expect(body.data.length).toBe(7);

    // Sorted alphabetically: Bisnis, Ensiklopedia Lama, Fiksi, Puisi Klasik, Sains, Sejarah, Teknologi
    expect(body.data[0]?.name).toBe('Bisnis');
    expect(body.data[0]?.status).toBe('active');
    expect(body.data[0]?.book_count).toBe(1);

    const fiksi = body.data.find((g) => g.id === QA_IDS.genres.fiksi);
    expect(fiksi).toBeDefined();
    expect(fiksi?.book_count).toBe(2);

    const unused = body.data.find((g) => g.id === QA_IDS.genres.unused);
    expect(unused).toBeDefined();
    expect(unused?.book_count).toBe(0);
    expect(unused?.status).toBe('active');
  });

  it('AC-11.10: filters genres by name substring ignoring case and handles empty results', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    // Search case-insensitive 'tekno'
    const searchRes = await app.handle(
      new Request('http://localhost/api/v1/admin/genres?q=TEKNO', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(searchRes.status).toBe(200);
    const searchBody = (await searchRes.json()) as {
      data: Array<{ name: string }>;
      pagination: { total: number };
    };
    expect(searchBody.data.length).toBe(1);
    expect(searchBody.data[0]?.name).toBe('Teknologi');
    expect(searchBody.pagination.total).toBe(1);

    // Empty search result returns 200 with empty array
    const emptyRes = await app.handle(
      new Request('http://localhost/api/v1/admin/genres?q=tidakada', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(emptyRes.status).toBe(200);
    const emptyBody = (await emptyRes.json()) as {
      data: Array<unknown>;
      pagination: { total: number; totalPages: number };
    };
    expect(emptyBody.data).toEqual([]);
    expect(emptyBody.pagination.total).toBe(0);
    expect(emptyBody.pagination.totalPages).toBe(0);
  });

  it('rejects invalid query parameters with 422 invalid_request', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const invalidPage = await app.handle(
      new Request('http://localhost/api/v1/admin/genres?page=0', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(invalidPage.status).toBe(422);

    const invalidLimit = await app.handle(
      new Request('http://localhost/api/v1/admin/genres?limit=100', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(invalidLimit.status).toBe(422);
  });

  it('AC-11.02: adds a new active genre with trimmed name and makes it available', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({ name: '  Komik Strip  ' }),
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      data: { id: string; name: string; status: string };
      message: string;
    };
    expect(body.message).toBe(API_MESSAGES.GENRE_CREATED);
    expect(body.data.name).toBe('Komik Strip');
    expect(body.data.status).toBe('active');
    expect(body.data.id).toBeDefined();

    // Available in public active genres
    const activeRes = await app.handle(
      new Request('http://localhost/api/v1/genres'),
    );
    const activeBody = (await activeRes.json()) as {
      data: Array<{ name: string }>;
    };
    expect(activeBody.data.some((g) => g.name === 'Komik Strip')).toBe(true);
  });

  it('AC-11.03: validates mandatory name on create and update with verbatim Field harus diisi!', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    // Empty body on create
    const emptyCreate = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({}),
      }),
    );
    expect(emptyCreate.status).toBe(422);
    expect(await emptyCreate.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: API_MESSAGES.FIELD_REQUIRED,
      data: { field: 'name' },
    });

    // Whitespace only on create
    const blankCreate = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({ name: '   ' }),
      }),
    );
    expect(blankCreate.status).toBe(422);
    expect(await blankCreate.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: API_MESSAGES.FIELD_REQUIRED,
      data: { field: 'name' },
    });

    // Empty body on update
    const emptyUpdate = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.fiksi}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({}),
        },
      ),
    );
    expect(emptyUpdate.status).toBe(422);
    expect(await emptyUpdate.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: API_MESSAGES.FIELD_REQUIRED,
      data: { field: 'name' },
    });

    // Whitespace only name on update
    const blankUpdate = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.fiksi}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({ name: '   ' }),
        },
      ),
    );
    expect(blankUpdate.status).toBe(422);
    expect(await blankUpdate.json()).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'invalid_request',
      message: API_MESSAGES.FIELD_REQUIRED,
      data: { field: 'name' },
    });
  });

  it('AC-11.04: rejects duplicate genre names case-insensitively with 409 Genre sudah ada', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    // Exact duplicate on create
    const exactDup = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({ name: 'Fiksi' }),
      }),
    );
    expect(exactDup.status).toBe(409);
    expect(await exactDup.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'conflict',
      message: API_MESSAGES.GENRE_ALREADY_EXISTS,
      data: { field: 'name' },
    });

    // Case-insensitive duplicate with whitespace on create
    const caseDup = await app.handle(
      new Request('http://localhost/api/v1/admin/genres', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({ name: '  FIKSI  ' }),
      }),
    );
    expect(caseDup.status).toBe(409);
    expect(await caseDup.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'conflict',
      message: API_MESSAGES.GENRE_ALREADY_EXISTS,
      data: { field: 'name' },
    });

    // Duplicate on update to another existing genre's name
    const updateDup = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.bisnis}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({ name: 'teknologi' }),
        },
      ),
    );
    expect(updateDup.status).toBe(409);
    expect(await updateDup.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'conflict',
      message: API_MESSAGES.GENRE_ALREADY_EXISTS,
      data: { field: 'name' },
    });

    // Updating same genre with its own name should not trigger duplicate conflict
    const selfUpdate = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.bisnis}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({ name: 'Bisnis' }),
        },
      ),
    );
    expect(selfUpdate.status).toBe(200);
  });

  it('AC-11.05: updates genre name and returns 200 with Genre berhasil diubah', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const response = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.fiksi}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({ name: '  Fiksi Fantasi  ' }),
        },
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { id: string; name: string; status: string };
      message: string;
    };
    expect(body.message).toBe(API_MESSAGES.GENRE_UPDATED);
    expect(body.data.name).toBe('Fiksi Fantasi');
    expect(body.data.id).toBe(QA_IDS.genres.fiksi);
  });

  it('AC-11.06: deactivates active genre and returns 200 with Genre berhasil dinonaktifkan', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const response = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.teknologi}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({ status: 'inactive' }),
        },
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { id: string; status: string };
      message: string;
    };
    expect(body.message).toBe(API_MESSAGES.GENRE_DEACTIVATED);
    expect(body.data.status).toBe('inactive');

    // Excluded from public active genres list
    const activeRes = await app.handle(
      new Request('http://localhost/api/v1/genres'),
    );
    const activeBody = (await activeRes.json()) as {
      data: Array<{ id: string }>;
    };
    expect(activeBody.data.some((g) => g.id === QA_IDS.genres.teknologi)).toBe(
      false,
    );
  });

  it('AC-11.07: reactivates inactive genre and returns 200 with Genre berhasil diaktifkan', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const response = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.sains}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({ status: 'active' }),
        },
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { id: string; status: string };
      message: string;
    };
    expect(body.message).toBe(API_MESSAGES.GENRE_ACTIVATED);
    expect(body.data.status).toBe('active');

    // Included back into public active genres list
    const activeRes = await app.handle(
      new Request('http://localhost/api/v1/genres'),
    );
    const activeBody = (await activeRes.json()) as {
      data: Array<{ id: string }>;
    };
    expect(activeBody.data.some((g) => g.id === QA_IDS.genres.sains)).toBe(
      true,
    );
  });

  it('AC-11.08: hard-deletes unused genre and returns 200 with Genre berhasil dihapus', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const response = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.unused}`,
        {
          method: 'DELETE',
          headers: { cookie: adminCookie },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { id: QA_IDS.genres.unused },
      message: API_MESSAGES.GENRE_DELETED,
    });

    // Ensure it is completely gone
    const checkRes = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.unused}`,
        {
          method: 'DELETE',
          headers: { cookie: adminCookie },
        },
      ),
    );
    expect(checkRes.status).toBe(404);
  });

  it('AC-11.09: rejects DELETE for genre used by books with 409 genre_in_use and verbatim AC copy', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    // QA_IDS.genres.fiksi is used by bookA, bookG, bookH, bookJ
    const response = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/genres/${QA_IDS.genres.fiksi}`,
        {
          method: 'DELETE',
          headers: { cookie: adminCookie },
        },
      ),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'genre_in_use',
      message: API_MESSAGES.GENRE_IN_USE,
    });
  });

  it('AC-11.09: rejects DELETE for genre chosen by Member preference with 409 genre_in_use', async () => {
    // Custom repository where genre is chosen by user preference but has 0 books
    const customRepo = new InMemoryBooksRepository(
      [
        {
          id: '11111111-0000-4000-8001-000000000001',
          name: 'Novel Grafis',
          status: 'active',
          createdAt: new Date(),
        },
      ],
      [], // no books
      [], // no book_genres
      [], // no loans
      [], // no ratings
      [
        {
          userId: QA_IDS.users.member1,
          genreId: '11111111-0000-4000-8001-000000000001',
        },
      ],
    );

    const app = createApp({ booksRepository: customRepo });
    const adminCookie = await getAdminSessionCookie(app);

    const response = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/genres/11111111-0000-4000-8001-000000000001',
        {
          method: 'DELETE',
          headers: { cookie: adminCookie },
        },
      ),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'genre_in_use',
      message: API_MESSAGES.GENRE_IN_USE,
    });
  });

  it('returns 404 for invalid UUID or non-existent genre on PATCH and DELETE', async () => {
    const app = createApp();
    const adminCookie = await getAdminSessionCookie(app);

    const invalidUuidPatch = await app.handle(
      new Request('http://localhost/api/v1/admin/genres/not-a-uuid', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({ name: 'Valid Name' }),
      }),
    );
    expect(invalidUuidPatch.status).toBe(404);

    const notFoundPatch = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/genres/00000000-0000-0000-0000-999999999999',
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            cookie: adminCookie,
          },
          body: JSON.stringify({ name: 'Valid Name' }),
        },
      ),
    );
    expect(notFoundPatch.status).toBe(404);

    const invalidUuidDelete = await app.handle(
      new Request('http://localhost/api/v1/admin/genres/not-a-uuid', {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      }),
    );
    expect(invalidUuidDelete.status).toBe(404);

    const notFoundDelete = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/genres/00000000-0000-0000-0000-999999999999',
        {
          method: 'DELETE',
          headers: { cookie: adminCookie },
        },
      ),
    );
    expect(notFoundDelete.status).toBe(404);
  });

  it('translates PostgreSQL constraint violations in DrizzleBooksRepository (AC-11.04, AC-11.09)', async () => {
    const fakeDbUnique = {
      insert() {
        return {
          values() {
            return {
              returning() {
                const error = new Error('duplicate key');
                (error as unknown as { code: string }).code = '23505';
                return Promise.reject(error);
              },
            };
          },
        };
      },
      update() {
        return {
          set() {
            return {
              where() {
                return {
                  returning() {
                    const error = new Error('duplicate key');
                    (error as unknown as { code: string }).code = '23505';
                    return Promise.reject(error);
                  },
                };
              },
            };
          },
        };
      },
      transaction() {
        const error = new Error('foreign key constraint');
        (error as unknown as { code: string }).code = '23503';
        return Promise.reject(error);
      },
    } as unknown as Database;

    const repository = new DrizzleBooksRepository(fakeDbUnique);

    await expect(
      repository.createGenre({ name: 'Fiksi' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'conflict',
      message: API_MESSAGES.GENRE_ALREADY_EXISTS,
    });

    await expect(
      repository.updateGenre(QA_IDS.genres.fiksi, { name: 'Teknologi' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'conflict',
      message: API_MESSAGES.GENRE_ALREADY_EXISTS,
    });

    await expect(
      repository.deleteGenre(QA_IDS.genres.fiksi),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'genre_in_use',
      message: API_MESSAGES.GENRE_IN_USE,
    });
  });
});
