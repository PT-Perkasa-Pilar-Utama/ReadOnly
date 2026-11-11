import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { useNavigate } from '@tanstack/solid-router';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import {
  deleteAdminBook,
  getAdminBooks,
  getAdminGenres,
} from '../../api/books';
import { ApiRequestError } from '../../api/client';
import { AdminHeader } from '../../components/AdminHeader';
import {
  requestAdminConfirmation,
  showAdminFeedback,
} from '../../components/admin-feedback-store';
import './MasterBooksPage.css';

const numberFormatter = new Intl.NumberFormat('id-ID');

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function MasterBooksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [selectedAuthor, setSelectedAuthor] = createSignal('');
  const [selectedGenre, setSelectedGenre] = createSignal('');
  const [appliedAuthor, setAppliedAuthor] = createSignal('');
  const [appliedGenre, setAppliedGenre] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [deletingBookId, setDeletingBookId] = createSignal<string | null>(null);

  createEffect(() => {
    const value = searchText().trim();
    const timeoutId = window.setTimeout(() => setDebouncedSearch(value), 250);
    onCleanup(() => window.clearTimeout(timeoutId));
  });

  createEffect(() => {
    debouncedSearch();
    setPage(1);
  });

  const booksQuery = createQuery(() => ({
    queryKey: [
      'admin',
      'books',
      'list',
      debouncedSearch(),
      appliedAuthor(),
      appliedGenre(),
      page(),
    ],
    queryFn: ({ signal }) =>
      getAdminBooks(
        {
          ...(debouncedSearch() ? { q: debouncedSearch() } : {}),
          ...(appliedAuthor() ? { author: appliedAuthor() } : {}),
          ...(appliedGenre() ? { genre: appliedGenre() } : {}),
          page: page(),
          limit: 10,
        },
        signal,
      ),
  }));

  const genresQuery = createQuery(() => ({
    queryKey: ['admin', 'book-genre-options'],
    queryFn: ({ signal }) => getAdminGenres(signal),
    staleTime: 60_000,
  }));

  async function handleDelete(bookId: string, title: string) {
    const confirmed = await requestAdminConfirmation(
      `Apakah Anda yakin menghapus buku ${title} ini?`,
    );
    if (!confirmed) return;

    setDeletingBookId(bookId);

    try {
      await deleteAdminBook(bookId);
      showAdminFeedback('Buku berhasil dihapus', 'success');
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'books', 'list'],
      });
    } catch (error) {
      const message =
        error instanceof ApiRequestError &&
        (error.statusCode === 403 || error.code === 'forbidden')
          ? 'Buku tidak dapat dihapus karena masih dipinjam'
          : getErrorMessage(error);
      showAdminFeedback(message, 'error');
    } finally {
      setDeletingBookId(null);
    }
  }

  function applyFilters() {
    setAppliedAuthor(selectedAuthor());
    setAppliedGenre(selectedGenre());
    setPage(1);
  }

  const currentPage = () => booksQuery.data?.pagination.page ?? page();
  const totalPages = () => booksQuery.data?.pagination.totalPages ?? 0;
  const totalBooks = () => booksQuery.data?.pagination.total ?? 0;
  const visiblePageNumbers = () => {
    const total = totalPages();
    const current = currentPage();
    const start = Math.max(1, Math.min(current - 2, total - 4));
    return Array.from(
      { length: Math.min(5, total) },
      (_, index) => start + index,
    );
  };

  return (
    <div class="master-books-app">
      <AdminHeader activeSection="books" />

      <main class="master-books-main master-books-main--list">
        <section class="master-books-heading">
          <div>
            <h1>Master Buku</h1>
            <p class="master-books-subtitle">Kelola data buku perpustakaan</p>
          </div>
          <div class="master-books-heading__actions">
            <button
              class="master-books-button master-books-button--primary"
              type="button"
              onClick={() => void navigate({ to: '/admin/books/new' })}
            >
              <span aria-hidden="true">+</span>
              Add
            </button>
          </div>
        </section>

        <fieldset class="master-books-toolbar" aria-label="Filter buku">
          <label class="master-books-search">
            <span>Cari Buku</span>
            <input
              type="search"
              value={searchText()}
              onInput={(event) => setSearchText(event.currentTarget.value)}
              placeholder="Cari judul buku, penulis, atau genre"
              aria-label="Cari judul buku, penulis, atau genre"
            />
          </label>

          <label class="master-books-filter-field">
            <span>Penulis</span>
            <select
              value={selectedAuthor()}
              onChange={(event) => setSelectedAuthor(event.currentTarget.value)}
              aria-label="Filter Penulis"
            >
              <option value="">Semua Penulis</option>
              <For each={booksQuery.data?.authors ?? []}>
                {(author) => <option value={author}>{author}</option>}
              </For>
            </select>
          </label>

          <label class="master-books-filter-field">
            <span>Genre</span>
            <select
              value={selectedGenre()}
              onChange={(event) => setSelectedGenre(event.currentTarget.value)}
              aria-label="Filter Genre"
            >
              <option value="">Semua Genre</option>
              <For each={genresQuery.data ?? []}>
                {(genre) => <option value={genre.id}>{genre.name}</option>}
              </For>
            </select>
          </label>

          <button
            class="master-books-button master-books-button--filter"
            type="button"
            onClick={applyFilters}
            disabled={genresQuery.isPending || booksQuery.isPending}
          >
            Set Filter
          </button>
        </fieldset>

        <Show when={genresQuery.isError}>
          <p class="master-books-inline-error" role="alert">
            {getErrorMessage(genresQuery.error)}
          </p>
        </Show>

        <section class="master-books-panel" aria-label="Daftar buku">
          <Show when={booksQuery.isPending}>
            <div class="master-books-state" aria-live="polite" aria-busy="true">
              <span class="master-books-loader" aria-hidden="true" />
            </div>
          </Show>

          <Show when={booksQuery.isError}>
            <div
              class="master-books-state master-books-state--error"
              role="alert"
            >
              {getErrorMessage(booksQuery.error)}
            </div>
          </Show>

          <Show when={!booksQuery.isPending && !booksQuery.isError}>
            <div class="master-books-table-wrap">
              <table class="master-books-table">
                <thead>
                  <tr>
                    <th scope="col">Cover</th>
                    <th scope="col">Judul Buku</th>
                    <th scope="col">Penulis</th>
                    <th scope="col">Penerbit</th>
                    <th scope="col">Tahun Terbit</th>
                    <th scope="col">Genre</th>
                    <th scope="col">Ketersediaan</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={(booksQuery.data?.books.length ?? 0) > 0}
                    fallback={
                      <tr>
                        <td class="master-books-empty" colSpan={8}>
                          Buku tidak ditemukan
                        </td>
                      </tr>
                    }
                  >
                    <For each={booksQuery.data?.books ?? []}>
                      {(book) => (
                        <tr>
                          <td>
                            <div class="master-books-cover-thumb">
                              <Show
                                when={book.cover_url}
                                fallback={<span aria-hidden="true">▤</span>}
                              >
                                <img
                                  src={book.cover_url ?? ''}
                                  alt={`Cover ${book.title}`}
                                />
                              </Show>
                            </div>
                          </td>
                          <td class="master-books-title-cell">{book.title}</td>
                          <td>{book.author}</td>
                          <td>{book.publisher}</td>
                          <td>{book.publication_year}</td>
                          <td>
                            <div class="master-books-genre-list">
                              <For each={book.genres}>
                                {(genre) => (
                                  <span class="master-books-genre-item">
                                    {genre.name}
                                    <Show when={genre.status === 'inactive'}>
                                      <small>Nonaktif</small>
                                    </Show>
                                  </span>
                                )}
                              </For>
                            </div>
                          </td>
                          <td>
                            <span class="master-books-availability">
                              {numberFormatter.format(book.available_count)}{' '}
                              tersedia
                            </span>
                          </td>
                          <td>
                            <div class="master-books-row-actions">
                              <button
                                class="master-books-icon-button"
                                type="button"
                                aria-label={`Edit ${book.title}`}
                                title="Edit"
                                onClick={() =>
                                  void navigate({
                                    to: '/admin/books/$bookId/edit',
                                    params: { bookId: book.id },
                                  })
                                }
                              >
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M3.5 13.9 13.7 3.7a1.8 1.8 0 0 1 2.6 0l.1.1a1.8 1.8 0 0 1 0 2.6L6.2 16.6l-3.1.8z" />
                                  <path d="m11.9 5.5 2.6 2.6M3.1 17.4l3.1-.8" />
                                </svg>
                              </button>
                              <button
                                class="master-books-icon-button master-books-icon-button--danger"
                                type="button"
                                aria-label={`Hapus ${book.title}`}
                                title="Hapus"
                                disabled={deletingBookId() === book.id}
                                onClick={() =>
                                  void handleDelete(book.id, book.title)
                                }
                              >
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M4 5.5h12M7.2 5.5V3.8h5.6v1.7m-7.2 0 .7 10.8h6.9l.7-10.8M8 8.2v5.5m4-5.5v5.5" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </table>
            </div>
          </Show>
        </section>

        <Show when={!booksQuery.isPending && !booksQuery.isError}>
          <div class="master-books-table-footer">
            <p>
              Menampilkan {booksQuery.data?.books.length ?? 0} dari{' '}
              {numberFormatter.format(totalBooks())} buku
            </p>
            <nav
              class="master-books-pagination"
              aria-label="Paginasi daftar buku"
            >
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={currentPage() <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                ‹
              </button>
              <For each={visiblePageNumbers()}>
                {(pageNumber) => (
                  <button
                    type="button"
                    classList={{ 'is-current': pageNumber === currentPage() }}
                    aria-label={`Halaman ${pageNumber}`}
                    aria-current={
                      pageNumber === currentPage() ? 'page' : undefined
                    }
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                )}
              </For>
              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={totalPages() === 0 || currentPage() >= totalPages()}
                onClick={() =>
                  setPage((value) => Math.min(totalPages(), value + 1))
                }
              >
                ›
              </button>
            </nav>
          </div>
        </Show>
      </main>
    </div>
  );
}
