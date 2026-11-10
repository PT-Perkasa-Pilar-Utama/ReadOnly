import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { useNavigate } from '@tanstack/solid-router';
import { createSignal, Show } from 'solid-js';
import {
  confirmLoanReturn,
  getFineAmountValidationMessage,
  payLoanFine,
} from '../../api/loan-workflows';
import {
  formatLoanAmount,
  formatLoanDate,
  getAdminLoanDetail,
  getLoanStatusClass,
  getLoanStatusLabel,
} from '../../api/loans';
import { AdminHeader } from '../../components/AdminHeader';
import { notify } from '../../components/Feedback';
import Modal from '../../components/Modal';
import './LoanManagementPage.css';

interface LoanDetailPageProps {
  loanId: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function LoanDetailPage(props: LoanDetailPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fineModalOpen, setFineModalOpen] = createSignal(false);
  const [fineAmountInput, setFineAmountInput] = createSignal('');
  const [fineAmountError, setFineAmountError] = createSignal('');
  const [processingAction, setProcessingAction] = createSignal(false);

  const loanQuery = createQuery(() => ({
    queryKey: ['admin', 'loans', 'detail', props.loanId],
    queryFn: ({ signal }) => getAdminLoanDetail(props.loanId, signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  }));

  const loan = () => loanQuery.data;
  const showFineDetails = () =>
    loan()?.status === 'OVERDUE' || loan()?.status === 'FINE_PENDING';

  async function refreshLoanData() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['admin', 'loans'],
      }),
      queryClient.invalidateQueries({ queryKey: ['books'] }),
      queryClient.invalidateQueries({ queryKey: ['book'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'books', 'list'] }),
    ]);
  }

  async function handleConfirmReturn() {
    const detail = loan();
    if (!detail?.can_confirm_return || processingAction()) return;

    const confirmed = window.confirm(
      `Apakah Anda yakin ${detail.borrower.full_name} telah ` +
        'mengembalikan Buku?',
    );
    if (!confirmed) return;

    setProcessingAction(true);
    try {
      await confirmLoanReturn(props.loanId);
      notify('Buku berhasil Dikembalikan', 'success');
      await refreshLoanData();
      await navigate({ to: '/admin/loans' });
    } catch (error) {
      notify(
        getErrorMessage(error) || 'Konfirmasi pengembalian gagal.',
        'error',
      );
    } finally {
      setProcessingAction(false);
    }
  }

  async function handlePayFine() {
    const detail = loan();
    if (!detail?.can_pay_fine || processingAction()) return;

    if (detail.late_days >= 5 && detail.fine_amount === null) {
      setFineAmountInput('');
      setFineAmountError('');
      setFineModalOpen(true);
      return;
    }

    const amount = detail.fine_amount;
    if (amount === null) return;

    const confirmed = window.confirm(
      `Denda ${detail.borrower.full_name} adalah ` +
        `${formatLoanAmount(amount)}. ` +
        'Apakah benar telah dibayar?',
    );
    if (!confirmed) return;

    setProcessingAction(true);
    try {
      await payLoanFine(props.loanId);
      notify('Denda Berhasil Dibayar', 'success');
      await refreshLoanData();
    } catch (error) {
      notify(getErrorMessage(error) || 'Pembayaran denda gagal.', 'error');
    } finally {
      setProcessingAction(false);
    }
  }

  async function submitManualFine(event: SubmitEvent) {
    event.preventDefault();
    const rawAmount = fineAmountInput().trim();
    const validationMessage = getFineAmountValidationMessage(rawAmount);

    if (validationMessage) {
      setFineAmountError(validationMessage);
      return;
    }
    if (processingAction()) return;

    setProcessingAction(true);
    setFineAmountError('');
    try {
      await payLoanFine(props.loanId, Number(rawAmount));
      setFineModalOpen(false);
      notify('Denda Berhasil Dibayar', 'success');
      await refreshLoanData();
    } catch (error) {
      setFineAmountError(
        getErrorMessage(error) || 'Biaya denda wajib diisi dengan angka',
      );
    } finally {
      setProcessingAction(false);
    }
  }

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
          <div
            class="loan-management-state"
            aria-live="polite"
            aria-busy="true"
          >
            <span class="loan-management-loader" aria-hidden="true" />
          </div>
        </Show>

        <Show when={loanQuery.isError}>
          <div
            class="loan-management-state loan-management-state--error"
            role="alert"
          >
            {getErrorMessage(loanQuery.error)}
          </div>
        </Show>

        <Show when={loan()}>
          {(detail) => (
            <div class="loan-detail-card">
              <section
                class="loan-detail-section"
                aria-labelledby="loan-detail-heading"
              >
                <div class="loan-detail-section__heading">
                  <h2 id="loan-detail-heading">Detail Peminjaman</h2>
                  <span
                    class={`loan-status-badge ${getLoanStatusClass(
                      detail().status,
                    )}`}
                  >
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
                      <span>Biaya Denda</span>
                      <strong>{formatLoanAmount(detail().fine_amount)}</strong>
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

              <section
                class="loan-detail-section loan-detail-section--book"
                aria-labelledby="loan-book-heading"
              >
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
                        <strong>
                          {detail().book.genres.join(', ') || '-'}
                        </strong>
                      </div>
                    </div>
                    <div class="loan-detail-book__synopsis">
                      <span>Sinopsis</span>
                      <p>{detail().book.synopsis}</p>
                    </div>
                  </div>
                </div>
              </section>

              <Show
                when={
                  detail().status === 'RETURN_PENDING' ||
                  detail().status === 'FINE_PENDING'
                }
              >
                <section
                  class="loan-detail-actions"
                  aria-label="Aksi pengembalian dan denda"
                >
                  <Show when={detail().status === 'FINE_PENDING'}>
                    <button
                      class={
                        'loan-management-button loan-management-button--secondary'
                      }
                      type="button"
                      onClick={() => void handlePayFine()}
                      disabled={!detail().can_pay_fine || processingAction()}
                    >
                      Pembayaran Denda
                    </button>
                  </Show>
                  <button
                    class={
                      'loan-management-button loan-management-button--primary'
                    }
                    type="button"
                    onClick={() => void handleConfirmReturn()}
                    disabled={
                      !detail().can_confirm_return || processingAction()
                    }
                  >
                    Konfirmasi Pengembalian
                  </button>
                </section>
              </Show>
            </div>
          )}
        </Show>
      </main>

      <Show when={fineModalOpen()}>
        <Modal
          title="Biaya Denda"
          onClose={() => {
            if (!processingAction()) setFineModalOpen(false);
          }}
          class="loan-fine-modal"
        >
          <form onSubmit={submitManualFine}>
            <Show when={loan()}>
              {(detail) => (
                <div class="loan-fine-modal__details">
                  <h3>Detail Peminjam</h3>
                  <p>
                    <span>Nama Peminjam</span>
                    <strong>{detail().borrower.full_name}</strong>
                  </p>
                  <p>
                    <span>Durasi Keterlambatan</span>
                    <strong>{detail().late_days} hari</strong>
                  </p>
                  <h3>Detail Buku</h3>
                  <div class="loan-fine-modal__book">
                    <div class="loan-fine-modal__cover">
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
                    <div>
                      <strong>{detail().book.title}</strong>
                      <p>{detail().book.author}</p>
                      <p>
                        {detail().book.publisher} ·{' '}
                        {detail().book.publication_year}
                      </p>
                      <p>{detail().book.genres.join(', ') || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </Show>

            <label class="loan-fine-modal__field">
              <span>Biaya Denda</span>
              <input
                type="text"
                inputMode="numeric"
                aria-required="true"
                value={fineAmountInput()}
                onInput={(event) => {
                  setFineAmountInput(event.currentTarget.value);
                  setFineAmountError('');
                }}
                aria-invalid={Boolean(fineAmountError())}
                aria-describedby={
                  fineAmountError() ? 'fine-amount-error' : undefined
                }
                placeholder="Masukkan biaya denda"
              />
              <Show when={fineAmountError()}>
                <small id="fine-amount-error" role="alert">
                  {fineAmountError()}
                </small>
              </Show>
            </label>

            <div class="form-actions">
              <button
                class="button secondary"
                type="button"
                onClick={() => setFineModalOpen(false)}
                disabled={processingAction()}
              >
                Batal
              </button>
              <button
                class="button"
                type="submit"
                disabled={processingAction()}
              >
                {processingAction() ? 'Memproses…' : 'Submit'}
              </button>
            </div>
          </form>
        </Modal>
      </Show>
    </div>
  );
}
