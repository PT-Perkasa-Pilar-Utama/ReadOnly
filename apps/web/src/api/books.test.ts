import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  type AdminBook,
  type BookGenre,
  getAdminBooks,
  getAdminGenres,
  getCoverValidationMessage,
  getGenreIdsForSubmit,
} from './books';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function coverFile(
  name: string,
  type: string,
  size: number,
): Pick<File, 'name' | 'type' | 'size'> {
  return { name, type, size };
}

describe('Master Buku frontend helpers', () => {
  test('mengambil daftar buku, filter, penulis, dan paginasi dari backend', async () => {
    const book: AdminBook = {
      id: 'book-1',
      title: 'Bumi Manusia',
      author: 'Pramoedya Ananta Toer',
      publisher: 'Lentera Dipantara',
      publication_year: 1980,
      synopsis: 'Novel sejarah.',
      cover_url: null,
      genres: [{ id: 'genre-1', name: 'Fiksi', status: 'active' }],
      available_count: 3,
      is_available: true,
      availability_label: 'Tersedia',
    };
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: [book],
        authors: ['Pramoedya Ananta Toer'],
        pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
      }),
    );

    await expect(
      getAdminBooks({
        q: 'Bumi',
        author: 'Pramoedya Ananta Toer',
        genre: 'genre-1',
        page: 2,
        limit: 10,
      }),
    ).resolves.toEqual({
      books: [book],
      authors: ['Pramoedya Ananta Toer'],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/admin/books?q=Bumi&author=Pramoedya+Ananta+Toer&genre=genre-1&page=2&limit=10',
    );
  });

  test('menolak daftar buku tanpa metadata paginasi dan penulis dari backend', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));

    await expect(getAdminBooks({ page: 1, limit: 10 })).rejects.toMatchObject({
      statusCode: 502,
      code: 'invalid_response',
    });
  });

  test('mengambil pilihan genre aktif dari endpoint yang tersedia', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: [
          {
            id: '00000000-0000-4000-8001-000000000001',
            name: 'Fiksi',
          },
        ],
      }),
    );

    await expect(getAdminGenres()).resolves.toEqual([
      {
        id: '00000000-0000-4000-8001-000000000001',
        name: 'Fiksi',
        status: 'active',
      },
    ]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/genres');
  });

  test('cover accepts PNG/JPG/JPEG within the shared maximum size', () => {
    expect(
      getCoverValidationMessage(
        coverFile('cover.png', 'image/png', 5 * 1024 * 1024),
      ),
    ).toBe(null);
    expect(
      getCoverValidationMessage(coverFile('cover.jpg', 'image/jpeg', 1024)),
    ).toBe(null);
    expect(
      getCoverValidationMessage(coverFile('cover.jpeg', 'image/jpeg', 1024)),
    ).toBe(null);
  });

  test('cover rejects an unsupported extension or MIME type', () => {
    expect(
      getCoverValidationMessage(coverFile('cover.gif', 'image/gif', 1024)),
    ).toBe('Format file cover buku tidak sesuai');
    expect(
      getCoverValidationMessage(coverFile('cover.jpg', 'image/gif', 1024)),
    ).toBe('Format file cover buku tidak sesuai');
  });

  test('cover rejects a file larger than five MiB', () => {
    expect(
      getCoverValidationMessage(
        coverFile('cover.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1),
      ),
    ).toBe('Ukuran file cover buku tidak boleh lebih dari 5Mb');
  });

  test('editing without changing a genre keeps the original inactive genre relation', () => {
    const inactiveGenre: BookGenre = {
      id: 'genre-old',
      name: 'Ensiklopedia Lama',
      status: 'inactive',
    };

    expect(getGenreIdsForSubmit('genre-old', [inactiveGenre])).toEqual([
      'genre-old',
    ]);
    expect(getGenreIdsForSubmit('genre-fiksi', [inactiveGenre])).toEqual([
      'genre-fiksi',
    ]);
  });
});
