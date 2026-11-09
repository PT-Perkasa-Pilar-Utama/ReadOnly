import { createQuery } from '@tanstack/solid-query';
import { useNavigate } from '@tanstack/solid-router';
import { Show } from 'solid-js';
import {
  formatLoanAmount,
  formatLoanDate,
  getAdminLoanDetail,
  getLoanStatusClass,
  getLoanStatusLabel,
} from '../../api/loans';
import { AdminHeader } from '../../components/AdminHeader';
import './LoanManagementPage.css';

interface LoanDetailPageProps {
  loanId: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function LoanDetailPage(props: LoanDetailPageProps) {
  const navigate = useNavigate();
  const loanQuery = createQuery(() => ({
    queryKey: ['admin', 'loans', 'detail', props.loanId],
    queryFn: ({ signal }) => getAdminLoanDetail(props.loanId, signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  }));

  const loan = () => loanQuery.data;
  const showFineDetails = () => loan()?.status === 'OVERDUE' || loan()?.status === 'FINE_PENDING';

  return (
    <div class="loan-management-app">
      <AdminHeader activeSection="loans" />

      <main class="loan-management-main">
        <div class="loan-management-breadcrumb">
          <a href="/admin/loans">Manajemen Peminjaman</a>
          <span aria-hidden="true">/</span>
          <span>Detail Peminjaman</span>
        </div>

        <section class="loan-management-heading loan-management-heading--detail">
          <div>
            <h1>Detail Peminjaman</h1>
            <p>Informasi lengkap peminjaman dan buku yang dipinjam</p>
          </div>
          <button
            class="loan-management-button loan-management-button--secondary"
            type="button"
            onClick={() => void navigate({ to: '/admin/loans' })}
          >
            Kembali
          </button>
        </section>

        <Show when={loanQuery.isPending}>
          <div class="loan-management-state" aria-live="polite" aria-busy="true">
            <span class="loan-management-loader" aria-hidden="true" />
          </div>
        </Show>

        <Show when={loanQuery.isError}>
          <div class="loan-management-state loan-management-state--error" role="alert">
            {getErrorMessage(loanQuery.error)}
          </div>
        </Show>

        <Show when={loan()}>
          {(detail) => (
            <div class="loan-detail-card">
              <section class="loan-detail-section" aria-labelledby="loan-detail-heading">
                <div class="loan-detail-section__heading">
                  <h2 id="loan-detail-heading">Detail Peminjaman</h2>
                  <span class={`loan-status-badge ${getLoanStatusClass(detail().status)}`}>
                    {getLoanStatusLabel(detail().status, detail().status_label)}
                  </span>
                </div>

                <div class="loan-detail-information">
                  <div class="loan-detail-field">
                    <span>Nomor Peminjaman</span>
                    <strong>{detail().loan_no}</strong>
                  </div>
                  <div class="loan-detail-field">
                    <span>Nama Peminjam</span>
                    <strong>{detail().borrower.full_name}</strong>
                  </div>
                  <div class="loan-detail-field">
                    <span>Email Peminjam</span>
                    <strong>{detail().borrower.email}</strong>
                  </div>
                  <div class="loan-detail-field">
                    <span>Tanggal Peminjaman</span>
                    <strong>{formatLoanDate(detail().confirmed_at)}</strong>
                  </div>
                  <div class="loan-detail-field">
                    <span>Batas Pengembalian</span>
                    <strong>{formatLoanDate(detail().due_date)}</strong>
                  </div>
                  <Show when={showFineDetails()}>
                    <div class="loan-detail-field">
                      <span>Keterlambatan (days)</span>
                      <strong>{detail().late_days}</strong>
                    </div>
                    <div class="loan-detail-field">
                      <span>Total Denda</span>
                      <strong>{formatLoanAmount(detail().fine_amount)}</strong>
                    </div>
                    <div class="loan-detail-field">
                      <span>Status Denda</span>
                      <strong>{detail().fine_status}</strong>
                    </div>
                  </Show>
                </div>
              </section>

              <section class="loan-detail-section loan-detail-section--book" aria-labelledby="loan-book-heading">
                <h2 id="loan-book-heading">Detail Buku</h2>
                <div class="loan-detail-book">
                  <div class="loan-detail-book__cover">
                    <Show
                      when={detail().book.cover_url}
                      fallback={<span aria-hidden="true">▤</span>}
                    >
                      <img
                        src={detail().book.cover_url ?? ''}
                        alt={`Cover ${detail().book.title}`}
                      />
                    </Show>
                  </div>

                  <div class="loan-detail-book__content">
                    <h3>{detail().book.title}</h3>
                    <div class="loan-detail-book__metadata">
                      <div>
                        <span>Penulis</span>
                        <strong>{detail().book.author}</strong>
                      </div>
                      <div>
                        <span>Penerbit</span>
                        <strong>{detail().book.publisher}</strong>
                      </div>
                      <div>
                        <span>Tahun Terbit</span>
                        <strong>{detail().book.publication_year}</strong>
                      </div>
                      <div>
                        <span>Genre</span>
                        <strong>{detail().book.genres.join(', ') || '-'}</strong>
                      </div>
                    </div>
                    <div class="loan-detail-book__synopsis">
                      <span>Sinopsis</span>
                      <p>{detail().book.synopsis}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </Show>
      </main>
    </div>
  );
}
