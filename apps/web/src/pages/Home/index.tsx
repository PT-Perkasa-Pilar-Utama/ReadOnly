import { createQuery } from '@tanstack/solid-query';
import { createSignal, For, Show } from 'solid-js';
import { getGenres } from '@web/api/auth';
import { getBooks } from '@web/api/books';
import BookCard from '@web/components/BookCard';
import { ErrorNotice, Loading } from '@web/components/Feedback';
import Icon from '@web/components/Icon';
import Pagination from '@web/components/Pagination';
import { debounced } from '@web/lib/debounced';

export default function HomePage() {
  const [search, setSearch] = createSignal('');
  const keyword = debounced(search);
  const [author, setAuthor] = createSignal('');
  const [genre, setGenre] = createSignal('');
  const [filters, setFilters] = createSignal({ author: '', genre: '' });
  const [page, setPage] = createSignal(1);
  const [filterOpen, setFilterOpen] = createSignal(false);
  const catalog = createQuery(() => ({
    queryKey: ['books', keyword(), filters(), page()],
    queryFn: ({ signal }) =>
      getBooks({ q: keyword(), ...filters(), page: page() }, signal),
  }));
  const genres = createQuery(() => ({
    queryKey: ['genres'],
    queryFn: getGenres,
  }));
  function apply(event: SubmitEvent) {
    event.preventDefault();
    setFilters({ author: author(), genre: genre() });
    setPage(1);
  }
  function reset() {
    setSearch('');
    setAuthor('');
    setGenre('');
    setFilters({ author: '', genre: '' });
    setPage(1);
  }
  return (
    <main class="page-container catalog-page">
      <section aria-labelledby="recommendations-heading">
        <header class="section-heading">
          <div>
            <span class="eyebrow">PILIHAN BACAAN</span>
            <h1 id="recommendations-heading">Rekomendasi untukmu</h1>
            <p>Berdasarkan genre pilihanmu dan rating buku.</p>
          </div>
          <Icon name="book" size={27} />
        </header>
        {/* AC-07.01: rekomendasi memakai respons API, bukan dihitung dari halaman katalog. */}
        <Show when={catalog.data} keyed>
          {(data) => (
            <Show
              when={data.recommendations.length}
              fallback={<p class="empty-inline">Belum ada rekomendasi buku.</p>}
            >
              <div class="book-grid recommendations">
                <For each={data.recommendations}>
                  {(book) => <BookCard book={book} />}
                </For>
              </div>
            </Show>
          )}
        </Show>
      </section>
      <section class="all-books" aria-labelledby="books-heading">
        <header class="section-heading">
          <div>
            <h2 id="books-heading">Semua Buku</h2>
            <p>Jelajahi seluruh koleksi, dari fiksi hingga pengetahuan baru.</p>
          </div>
          <Show when={catalog.data}>
            <span class="collection-count">
              {catalog.data?.pagination.total} buku
            </span>
          </Show>
        </header>
        {/* AC-07.02, AC-07.03: keyword otomatis, filter diterapkan lewat Set Filter. */}
        <div class="catalog-toolbar">
          <div class="search-field">
            <label for="book-search" class="sr-only">
              Cari buku
            </label>
            <Icon name="search" size={19} />
            <input
              id="book-search"
              type="search"
              value={search()}
              onInput={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              placeholder="Cari judul, penulis, atau genre"
            />
          </div>
          <button
            type="button"
            class="button secondary"
            aria-expanded={filterOpen()}
            aria-controls="catalog-filter"
            onClick={() => setFilterOpen(!filterOpen())}
          >
            <Icon name="filter" size={18} />
            Filter
            <Show when={filters().author || filters().genre}>
              <span class="filter-count">
                {Number(Boolean(filters().author)) +
                  Number(Boolean(filters().genre))}
              </span>
            </Show>
          </button>
        </div>
        <Show when={filterOpen()}>
          <form id="catalog-filter" class="filter-panel" onSubmit={apply}>
            <div class="field">
              <label for="author">Penulis</label>
              <select
                id="author"
                value={author()}
                onChange={(event) => setAuthor(event.currentTarget.value)}
              >
                <option value="">Semua Penulis</option>
                <For each={catalog.data?.authors}>
                  {(name) => <option value={name}>{name}</option>}
                </For>
              </select>
            </div>
            <div class="field">
              <label for="genre">Genre</label>
              <select
                id="genre"
                value={genre()}
                onChange={(event) => setGenre(event.currentTarget.value)}
                disabled={!genres.isSuccess}
              >
                <option value="">Semua Genre</option>
                <For each={genres.data}>
                  {(item) => <option value={item.id}>{item.name}</option>}
                </For>
              </select>
            </div>
            <button class="button" type="submit">
              Set Filter
            </button>
            <button class="text-button" type="button" onClick={reset}>
              Reset
            </button>
            <Show when={genres.isError}>
              <ErrorNotice
                error={genres.error}
                retry={() => void genres.refetch()}
              />
            </Show>
          </form>
        </Show>
        <Show when={catalog.isPending}>
          <Loading label="Memuat koleksi buku…" />
        </Show>
        <Show when={catalog.isError}>
          <ErrorNotice
            error={catalog.error}
            retry={() => void catalog.refetch()}
          />
        </Show>
        <Show when={catalog.data} keyed>
          {(data) => (
            <>
              <Show
                when={data.data.length}
                fallback={
                  <div class="empty-state">
                    <Icon name="search" size={32} />
                    <h3>Buku tidak ditemukan</h3>
                    <p>Coba kata kunci atau filter lainnya.</p>
                    <button
                      class="button secondary"
                      type="button"
                      onClick={reset}
                    >
                      Reset pencarian
                    </button>
                  </div>
                }
              >
                <div class="book-grid">
                  <For each={data.data}>
                    {(book) => <BookCard book={book} />}
                  </For>
                </div>
              </Show>
              <Pagination
                pagination={data.pagination}
                noun="buku"
                onChange={setPage}
              />
            </>
          )}
        </Show>
      </section>
    </main>
  );
}
