import { createQuery } from '@tanstack/solid-query';
import { Link, useParams } from '@tanstack/solid-router';
import { getBook } from '@web/api/books';
import { BookCover } from '@web/components/BookCard';
import { ErrorNotice, Loading } from '@web/components/Feedback';
import Icon from '@web/components/Icon';
import { For, Show } from 'solid-js';

export default function BookDetailPage() {
  const params = useParams({ strict: false });
  const book = createQuery(() => ({
    queryKey: ['book', params().bookId],
    queryFn: () => getBook(params().bookId ?? ''),
  }));
  return (
    <main class="page-container">
      <Link to="/home" class="back-link">
        <Icon name="back" size={17} />
        Kembali ke Home
      </Link>
      <header class="section-heading">
        <h1>Detail Buku</h1>
      </header>
      <Show when={book.isPending}>
        <Loading />
      </Show>
      <Show when={book.isError}>
        <ErrorNotice error={book.error} retry={() => void book.refetch()} />
      </Show>
      <Show when={book.data} keyed>
        {(data) => (
          <article class="detail-card">
            {/* AC-07.04: seluruh informasi detail ditampilkan sesuai kontrak /books/:id. */}
            <BookCover
              class="detail-cover"
              src={data.cover_url}
              title={data.title}
            />
            <div class="detail-content">
              <span
                class={`badge ${data.is_available ? 'available' : 'unavailable'}`}
              >
                {data.availability_label}
              </span>
              <h2>{data.title}</h2>
              <dl class="book-facts">
                <div>
                  <dt>Penulis</dt>
                  <dd>{data.author}</dd>
                </div>
                <div>
                  <dt>Penerbit</dt>
                  <dd>{data.publisher}</dd>
                </div>
                <div>
                  <dt>Tahun Terbit</dt>
                  <dd>{data.publication_year}</dd>
                </div>
                <div>
                  <dt>Genre</dt>
                  <dd>
                    <For each={data.genres}>
                      {(genre) => <span class="genre-label">{genre.name}</span>}
                    </For>
                  </dd>
                </div>
              </dl>
              <section class="synopsis">
                <h3>Sinopsis</h3>
                <p>{data.synopsis}</p>
              </section>
              <p class="availability-detail">
                <strong>Ketersediaan Buku</strong>
                <span>{data.available_count} tersedia</span>
              </p>
              <div class="borrow-integration">
                <button
                  type="button"
                  class="button"
                  disabled
                  aria-describedby="borrow-hint"
                >
                  Pinjam <Icon name="arrow" size={16} />
                </button>
                <p id="borrow-hint" class="small muted">
                  Peminjaman belum tersedia.
                </p>
              </div>
            </div>
          </article>
        )}
      </Show>
    </main>
  );
}
