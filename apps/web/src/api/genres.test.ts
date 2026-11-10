import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  createAdminGenre,
  deleteAdminGenre,
  getAdminGenreList,
  updateAdminGenre,
} from './genres';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Master Genre API', () => {
  test('lists genres with search and pagination', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: [
          { id: 'genre-1', name: 'Fiksi', status: 'active', book_count: 4 },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    await expect(
      getAdminGenreList({ q: '  fik ', page: 1, limit: 10 }),
    ).resolves.toMatchObject({
      genres: [{ id: 'genre-1', name: 'Fiksi', book_count: 4 }],
      pagination: { total: 1 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/admin/genres?q=fik&page=1&limit=10',
    );
  });

  test('creates a genre using the trimmed name', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: { id: 'genre-2', name: 'Sains', status: 'active' },
        message: 'Genre berhasil ditambahkan',
      }),
    );

    await expect(createAdminGenre('  Sains  ')).resolves.toMatchObject({
      data: { name: 'Sains', status: 'active' },
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ name: 'Sains' }),
    });
  });

  test('updates genre name and status through PATCH', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: { id: 'genre-1', name: 'Nonfiksi', status: 'inactive' },
        message: 'Genre berhasil dinonaktifkan',
      }),
    );

    await expect(
      updateAdminGenre('genre-1', { name: ' Nonfiksi ', status: 'inactive' }),
    ).resolves.toMatchObject({
      data: { name: 'Nonfiksi', status: 'inactive' },
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ name: 'Nonfiksi', status: 'inactive' }),
    });
  });

  test('deletes a genre through its resource endpoint', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: { id: 'genre-1' },
        message: 'Genre berhasil dihapus',
      }),
    );

    await expect(deleteAdminGenre('genre-1')).resolves.toMatchObject({
      data: { id: 'genre-1' },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/admin/genres/genre-1');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  test('keeps backend duplicate-name validation unchanged', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        {
          statusCode: 409,
          error: 'Conflict',
          code: 'conflict',
          message: 'Genre sudah ada',
        },
        { status: 409 },
      ),
    );

    await expect(createAdminGenre('fiksi')).rejects.toMatchObject({
      message: 'Genre sudah ada',
      status: 409,
    });
  });

  test('keeps the exact error when a genre is still referenced', async () => {
    const genreInUseMessage =
      'Genre tidak dapat dihapus karena masih digunakan. ' +
      'Nonaktifkan genre jika tidak ingin dipakai lagi.';
    spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        {
          statusCode: 409,
          error: 'Conflict',
          code: 'genre_in_use',
          message: genreInUseMessage,
        },
        { status: 409 },
      ),
    );

    await expect(deleteAdminGenre('genre-1')).rejects.toMatchObject({
      message: genreInUseMessage,
      status: 409,
    });
  });
});
