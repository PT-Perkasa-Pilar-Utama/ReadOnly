import { describe, expect, test } from 'bun:test';
import {
  type BookGenre,
  getCoverValidationMessage,
  getGenreIdsForSubmit,
} from './books';

function coverFile(
  name: string,
  type: string,
  size: number,
): Pick<File, 'name' | 'type' | 'size'> {
  return { name, type, size };
}

describe('Master Buku frontend helpers', () => {
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
