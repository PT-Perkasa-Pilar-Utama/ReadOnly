import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { Link, useNavigate, useParams } from '@tanstack/solid-router';
import { getBook } from '@web/api/books';
import { createLoan } from '@web/api/loan-workflows';
import { BookCover } from '@web/components/BookCard';
import { ErrorNotice, Loading, notify } from '@web/components/Feedback';
import Icon from '@web/components/Icon';
import { createSignal, For, Show } from 'solid-js';

export default function BookDetailPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = createSignal(false);

  const book = createQuery(() => ({
    queryKey: ['book', params().bookId],
    queryFn: () => getBook(params().bookId ?? ''),
  }));

  async function submitBorrow(bookId: string) {
    if (submitting()) return;
    setSubmitting(true);
    try {
      const result = await createLoan(bookId);
      notify(result.message ?? 'Pengajuan peminjaman berhasil', 'success');
      await queryClient.invalidateQueries({ queryKey: ['member', 'loans'] });
      await navigate({ to: '/loans' });
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Pengajuan peminjaman gagal. Silakan coba lagi.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }

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
            {/* AC-07.04: detail tetap mengikuti kontrak /books/:id. */}
            <BookCover
              class="detail-cover"
              src={data.cover_url}
              title={data.title}
            />
            <div class="detail-content">
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
                {/* AC-07.04: status dan jumlah buku tetap dari API. */}
                <span>Ketersediaan Buku:</span>
                <span
                  class={
                    data.is_available ? 'available-text' : 'unavailable-text'
                  }
                >
                  {data.availability_label}
                </span>
                <span class="muted">({data.available_count} buku)</span>
              </p>
              <div class="borrow-integration">
                <button
                  type="button"
                  class="button"
                  disabled={
                    !data.is_available ||
                    data.available_count <= 0 ||
                    submitting()
                  }
                  onClick={() => void submitBorrow(data.id)}
                >
                  {submitting() ? 'Mengajukan…' : 'Pinjam'}{' '}
                  <Icon name="arrow" size={16} />
                </button>
                <Show when={!data.is_available || data.available_count <= 0}>
                  <p class="small muted" id="borrow-hint">
                    Buku tidak tersedia.
                  </p>
                </Show>
              </div>
            </div>
          </article>
        )}
      </Show>
    </main>
  );
}
