import { describe, expect, test } from 'bun:test';
import {
  type AdminBook,
  type BookGenre,
  filterBooks,
  getCoverValidationMessage,
  getGenreIdsForSubmit,
} from './books';

const fiksi: BookGenre = {
  id: 'genre-fiksi',
  name: 'Fiksi',
  status: 'active',
};

const teknologi: BookGenre = {
  id: 'genre-teknologi',
  name: 'Teknologi',
  status: 'active',
};

const sampleBooks: AdminBook[] = [
  {
    id: 'book-1',
    title: 'Bumi Manusia',
    author: 'Pramoedya Ananta Toer',
    publisher: 'Lentera Dipantara',
    publication_year: 1980,
    synopsis: 'Novel sejarah.',
    cover_url: null,
    genres: [fiksi],
    available_count: 3,
    is_available: true,
    availability_label: 'Tersedia',
  },
  {
    id: 'book-2',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    publication_year: 2017,
    synopsis: 'Buku arsitektur perangkat lunak.',
    cover_url: null,
    genres: [teknologi],
    available_count: 0,
    is_available: false,
    availability_label: 'Tidak Tersedia',
  },
];

function coverFile(
  name: string,
  type: string,
  size: number,
): Pick<File, 'name' | 'type' | 'size'> {
  return { name, type, size };
}

describe('Master Buku frontend helpers', () => {
  test('search matches title, author, or genre without case sensitivity', () => {
    expect(
      filterBooks(sampleBooks, { q: 'BUMI' }).map((book) => book.id),
    ).toEqual(['book-1']);
    expect(
      filterBooks(sampleBooks, { q: 'robert' }).map((book) => book.id),
    ).toEqual(['book-2']);
    expect(
      filterBooks(sampleBooks, { q: 'teknologi' }).map((book) => book.id),
    ).toEqual(['book-2']);
  });

  test('author and genre filters are combined', () => {
    expect(
      filterBooks(sampleBooks, {
        author: 'Pramoedya Ananta Toer',
        genre: 'genre-fiksi',
      }).map((book) => book.id),
    ).toEqual(['book-1']);
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
