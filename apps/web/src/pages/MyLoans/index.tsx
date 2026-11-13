import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { createSignal, For, Show } from 'solid-js';
import {
  getLoanQr,
  getMyLoans,
  type MemberLoan,
} from '../../api/loan-workflows';
import { ErrorNotice, Loading } from '../../components/Feedback';
import Icon from '../../components/Icon';
import LoanQrCanvas from '../../components/loans/LoanQrCanvas';
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
  const [qrNumber, setQrNumber] = createSignal('');
  const [qrToken, setQrToken] = createSignal<string | null>(null);
  const [qrLoading, setQrLoading] = createSignal(false);
  const [qrError, setQrError] = createSignal<Error | null>(null);
  const [returnLoan, setReturnLoan] = createSignal<MemberLoan | null>(null);
  let qrRequestId = 0;

  const loansQuery = createQuery(() => ({
    queryKey: ['member', 'loans', page()],
    queryFn: ({ signal }) => getMyLoans(page(), 10, signal),
    refetchOnWindowFocus: true,
  }));

  async function loadLoanQr(loan: MemberLoan) {
    if (qrLoading()) return;

    const requestId = ++qrRequestId;
    setQrLoading(true);
    setQrError(null);
    setQrToken(null);
    setQrNumber(loan.loan_no);

    try {
      const result = await getLoanQr(loan.id);
      if (requestId !== qrRequestId || qrNoticeLoan()?.id !== loan.id) return;
      if (result.loan_id !== loan.id) {
        throw new Error('Respons QR Code tidak sesuai dengan peminjaman.');
      }

      setQrNumber(result.loan_no);
      setQrToken(result.qr_token);
    } catch (cause) {
      if (requestId !== qrRequestId || qrNoticeLoan()?.id !== loan.id) return;
      setQrError(
        cause instanceof Error
          ? cause
          : new Error('QR Code gagal dimuat. Silakan coba lagi.'),
      );
    } finally {
      if (requestId === qrRequestId) setQrLoading(false);
    }
  }

  function openQrModal(loan: MemberLoan) {
    setQrNoticeLoan(loan);
    setQrNumber(loan.loan_no);
    setQrToken(null);
    setQrError(null);
    void loadLoanQr(loan);
  }

  function closeQrModal() {
    qrRequestId += 1;
    setQrNoticeLoan(null);
    setQrNumber('');
    setQrToken(null);
    setQrError(null);
    setQrLoading(false);
  }

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
                                    onClick={() => openQrModal(loan)}
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
            onClose={closeQrModal}
            class="loan-qr-modal"
          >
            <div class="loan-qr-modal__content">
              <div class="loan-qr-modal__book">
                <div class="my-loans-cover">
                  <Show
                    when={loan.book_cover_url}
                    fallback={<span aria-hidden="true">▤</span>}
                  >
                    <img
                      src={loan.book_cover_url ?? ''}
                      alt={`Cover ${loan.book_title}`}
                    />
                  </Show>
                </div>
                <div class="loan-qr-modal__book-info">
                  <strong>{loan.book_title}</strong>
                  <span>{loan.book_author}</span>
                  <span class="my-loans-status my-loans-status--pending">
                    Pending Peminjaman
                  </span>
                </div>
              </div>

              <Show when={qrLoading()}>
                <Loading label="Membuat QR Code peminjaman…" />
              </Show>

              <Show when={qrError()}>
                <div class="loan-qr-modal__error" role="alert">
                  <p>QR Code gagal dimuat. Silakan coba lagi.</p>
                  <button
                    type="button"
                    class="button secondary"
                    onClick={() => void loadLoanQr(loan)}
                    disabled={qrLoading()}
                  >
                    Coba lagi
                  </button>
                </div>
              </Show>

              <Show when={qrToken()}>
                {(token) => <LoanQrCanvas token={token()} />}
              </Show>

              <p class="loan-qr-modal__number">No. Pinjaman: {qrNumber()}</p>

              <p class="loan-qr-modal__helper">
                Tunjukkan kode QR ini kepada Admin untuk konfirmasi peminjaman.
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
