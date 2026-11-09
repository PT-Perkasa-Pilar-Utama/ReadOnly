import { describe, expect, it } from 'bun:test';
import { type Database, QA_IDS } from '@readonly/db';
import { createApp } from '../../app';
import {
  DrizzleBooksRepository,
  InMemoryBooksRepository,
} from './books.repository';
import { BooksService } from './books.service';

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

  it('short-circuits DrizzleBooksRepository.findActiveGenreIds on empty input', async () => {
    let queryCalled = false;
    const fakeDb = {
      select() {
        queryCalled = true;
        throw new Error('Should not query database for empty ID list');
      },
    } as unknown as Database;

    const repository = new DrizzleBooksRepository(fakeDb);
    expect(await repository.findActiveGenreIds([])).toEqual([]);
    expect(queryCalled).toBe(false);
  });
});
