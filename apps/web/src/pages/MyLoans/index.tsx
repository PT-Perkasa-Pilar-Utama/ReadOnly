import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { createSignal, For, Show } from 'solid-js';
import { getMyLoans, type MemberLoan } from '../../api/loan-workflows';
import { ErrorNotice, Loading } from '../../components/Feedback';
import Icon from '../../components/Icon';
import { ReturnFeedbackModal } from '../../components/loans/ReturnFeedbackModal';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import './MyLoansPage.css';

function formatDate(value: string | null): string {
  if (!value) return '-';

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

function statusClass(status: MemberLoan['status']): string {
  const normalized = status.toLocaleLowerCase('en-US').replaceAll('_', '-');
  return `my-loans-status--${normalized}`;
}

export default function MyLoansPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = createSignal(1);
  const [qrNoticeLoan, setQrNoticeLoan] = createSignal<MemberLoan | null>(null);
  const [returnLoan, setReturnLoan] = createSignal<MemberLoan | null>(null);

  const loansQuery = createQuery(() => ({
    queryKey: ['member', 'loans', page()],
    queryFn: ({ signal }) => getMyLoans(page(), 10, signal),
    refetchOnWindowFocus: true,
  }));

  async function handleReturnSubmitted() {
    setReturnLoan(null);
    setPage(1);
    await queryClient.invalidateQueries({ queryKey: ['member', 'loans'] });
    await queryClient.invalidateQueries({ queryKey: ['books'] });
  }

  return (
    <main class="page-container my-loans-page">
      <header class="section-heading">
        <div>
          <span class="eyebrow">AKUN MEMBER</span>
          <h1>Pinjaman</h1>
          <p>Daftar peminjaman buku dan status pengembaliannya.</p>
        </div>
        <Icon name="book" size={27} />
      </header>

      <section class="my-loans-panel" aria-label="Daftar pinjaman saya">
        <Show when={loansQuery.isPending}>
          <Loading label="Memuat daftar pinjaman…" />
        </Show>

        <Show when={loansQuery.isError}>
          <ErrorNotice
            error={loansQuery.error}
            retry={() => void loansQuery.refetch()}
          />
        </Show>

        <Show when={loansQuery.data} keyed>
          {(result) => (
            <>
              <div class="my-loans-table-wrap">
                <table class="my-loans-table">
                  <thead>
                    <tr>
                      <th scope="col">Buku</th>
                      <th scope="col">Nomor Peminjaman</th>
                      <th scope="col">Tanggal</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Show
                      when={result.loans.length > 0}
                      fallback={
                        <tr>
                          <td class="my-loans-empty" colSpan={5}>
                            Belum ada pinjaman.
                          </td>
                        </tr>
                      }
                    >
                      <For each={result.loans}>
                        {(loan) => {
                          const isPending = loan.status === 'PENDING';
                          const dateLabel = isPending
                            ? 'Tanggal permintaan'
                            : 'Batas pengembalian';
                          const dateValue = isPending
                            ? loan.requested_at
                            : loan.due_date;

                          return (
                            <tr>
                              <td>
                                <div class="my-loans-book">
                                  <div class="my-loans-cover">
                                    <Show
                                      when={loan.book_cover_url}
                                      fallback={
                                        <span aria-hidden="true">▤</span>
                                      }
                                    >
                                      <img
                                        src={loan.book_cover_url ?? ''}
                                        alt={`Cover ${loan.book_title}`}
                                      />
                                    </Show>
                                  </div>
                                  <div>
                                    <strong>{loan.book_title}</strong>
                                    <small>{loan.book_author}</small>
                                  </div>
                                </div>
                              </td>
                              <td>{loan.loan_no}</td>
                              <td>
                                <span class="my-loans-date-label">
                                  {dateLabel}
                                </span>
                                <time dateTime={dateValue ?? undefined}>
                                  {formatDate(dateValue)}
                                </time>
                              </td>
                              <td>
                                <span
                                  class={`my-loans-status ${statusClass(
                                    loan.status,
                                  )}`}
                                >
                                  {loan.status_label}
                                </span>
                              </td>
                              <td>
                                <Show when={loan.member_action === 'QR'}>
                                  <button
                                    type="button"
                                    class="button my-loans-action"
                                    onClick={() => setQrNoticeLoan(loan)}
                                  >
                                    QR
                                  </button>
                                </Show>
                                <Show
                                  when={loan.member_action === 'Kembalikan'}
                                >
                                  <button
                                    type="button"
                                    class="button my-loans-action"
                                    onClick={() => setReturnLoan(loan)}
                                  >
                                    Kembalikan
                                  </button>
                                </Show>
                                <Show
                                  when={loan.member_action === 'Menunggu admin'}
                                >
                                  <span class="my-loans-note">
                                    Menunggu admin
                                  </span>
                                </Show>
                                <Show when={loan.member_action === 'Selesai'}>
                                  <span class="my-loans-note">Selesai</span>
                                </Show>
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </Show>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Show>
      </section>

      <Show when={loansQuery.data} keyed>
        {(result) => (
          <div class="my-loans-footer">
            <Pagination
              pagination={result.pagination}
              noun="pinjaman"
              onChange={setPage}
            />
          </div>
        )}
      </Show>

      <Show when={qrNoticeLoan()} keyed>
        {(loan) => (
          <Modal
            title="QR Code Peminjaman"
            onClose={() => setQrNoticeLoan(null)}
            class="loan-qr-modal"
          >
            <div class="loan-qr-modal__content">
              <p class="loan-qr-modal__number">{loan.loan_no}</p>
              <p>
                Tampilan QR menunggu penetapan pustaka generator QR pada
                keputusan Q-18. Token QR tidak ditampilkan sebagai teks.
              </p>
            </div>
          </Modal>
        )}
      </Show>

      <Show when={returnLoan()} keyed>
        {(loan) => (
          <ReturnFeedbackModal
            loan={loan}
            onClose={() => setReturnLoan(null)}
            onSubmitted={() => void handleReturnSubmitted()}
          />
        )}
      </Show>
    </main>
  );
}
