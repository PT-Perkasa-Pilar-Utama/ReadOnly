import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import {
  type DashboardSummary,
  getDashboardSummary,
  getReturnDistribution,
} from '../../api/dashboard';
import {
  confirmLoanQr,
  type LoanQrPreview,
  previewLoanQr,
} from '../../api/loan-workflows';
import { AdminHeader } from '../../components/AdminHeader';
import { notify } from '../../components/Feedback';
import Modal from '../../components/Modal';
import './DashboardPage.css';

const METRIC_CARDS: Array<{
  key: string;
  label: string;
  description: string;
  value: (summary: DashboardSummary) => number;
}> = [
  {
    key: 'total-books',
    label: 'Total Buku',
    description: 'Judul buku terdaftar',
    value: (summary) => summary.totalBooks,
  },
  {
    key: 'total-availability',
    label: 'Total Ketersediaan Buku',
    description: 'Eksemplar tersedia',
    value: (summary) => summary.totalAvailability,
  },
  {
    key: 'borrowed-count',
    label: 'Total Sedang Dipinjam',
    description: 'Dalam masa peminjaman',
    value: (summary) => summary.borrowedCount,
  },
  {
    key: 'overdue-count',
    label: 'Total Terlambat',
    description: 'Melewati batas pengembalian',
    value: (summary) => summary.overdueCount,
  },
  {
    key: 'returned-count',
    label: 'Total Sudah Dikembalikan',
    description: 'Transaksi selesai',
    value: (summary) => summary.returnedCount,
  },
];

const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  totalBooks: 0,
  totalAvailability: 0,
  borrowedCount: 0,
  overdueCount: 0,
  returnedCount: 0,
  pieChart: {
    onTime: 0,
    late: 0,
  },
};

const numberFormatter = new Intl.NumberFormat('id-ID');
const percentFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});

const reportDate = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

const requestedAtFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [scannerOpen, setScannerOpen] = createSignal(false);
  const [scannerError, setScannerError] = createSignal('');
  const [cameraStarting, setCameraStarting] = createSignal(false);
  const [manualOpen, setManualOpen] = createSignal(false);
  const [manualToken, setManualToken] = createSignal('');
  const [preview, setPreview] = createSignal<LoanQrPreview | null>(null);
  const [activeToken, setActiveToken] = createSignal('');
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [confirming, setConfirming] = createSignal(false);
  const [confirmError, setConfirmError] = createSignal('');
  const [scanAttempt, setScanAttempt] = createSignal(0);
  let scanner: Html5Qrcode | undefined;
  let scannerElement: HTMLDivElement | undefined;
  let scanLocked = false;

  const summaryQuery = createQuery(() => ({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: ({ signal }) => getDashboardSummary(signal),
    staleTime: 30_000,
  }));

  function normalizeQrError(error: unknown) {
    if (
      error instanceof Error &&
      /permission denied|notallowed|not allowed|NotAllowedError|secure context/i.test(
        error.message,
      )
    ) {
      return 'Akses kamera tidak diizinkan. Silakan aktifkan izin kamera pada browser Anda untuk memindai QR Code.';
    }
    return 'QR Code tidak valid. Silakan scan ulang.';
  }

  async function stopScanner() {
    const current = scanner;
    scanner = undefined;
    if (!current) return;
    try {
      if (current.isScanning) await current.stop();
    } catch {
      // Kamera mungkin telah dihentikan browser saat modal ditutup.
    }
    try {
      current.clear();
    } catch {
      // Elemen viewfinder akan dilepas bersama modal.
    }
  }

  async function handleDecodedToken(decodedText: string) {
    if (scanLocked || !decodedText.trim()) return;
    scanLocked = true;
    setPreviewLoading(true);
    setScannerError('');
    setActiveToken(decodedText);
    await stopScanner();
    setScannerOpen(false);
    try {
      const result = await previewLoanQr(decodedText);
      setPreview(result);
      setConfirmError('');
    } catch (error) {
      setActiveToken('');
      setPreview(null);
      setScannerError(normalizeQrError(error));
      setScanAttempt((value) => value + 1);
      setScannerOpen(true);
    } finally {
      setPreviewLoading(false);
      scanLocked = false;
    }
  }

  async function startScanner() {
    if (!scannerElement || scanner || cameraStarting()) return;
    setCameraStarting(true);
    setScannerError('');
    try {
      const instance = new Html5Qrcode(scannerElement.id, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scanner = instance;
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decodedText) => void handleDecodedToken(decodedText),
        () => undefined,
      );
      if (!scannerOpen()) {
        try {
          if (instance.isScanning) await instance.stop();
        } catch {
          // Modal ditutup saat browser masih menyiapkan stream kamera.
        }
        try {
          instance.clear();
        } catch {
          // Scanner sudah dibersihkan saat modal ditutup.
        }
        if (scanner === instance) scanner = undefined;
      }
    } catch (error) {
      await stopScanner();
      setScannerError(normalizeQrError(error));
    } finally {
      setCameraStarting(false);
    }
  }

  function openScanner() {
    if (previewLoading() || confirming()) return;
    setScannerError('');
    setPreview(null);
    setActiveToken('');
    scanLocked = false;
    setScannerOpen(true);
  }

  async function closeScanner() {
    setScannerOpen(false);
    await stopScanner();
  }

  async function submitManualToken(event: SubmitEvent) {
    event.preventDefault();
    const token = manualToken().trim();
    if (!token || previewLoading()) return;
    setPreviewLoading(true);
    setScannerError('');
    try {
      const result = await previewLoanQr(token);
      setActiveToken(token);
      setPreview(result);
      setScannerOpen(false);
      setManualOpen(false);
      setManualToken('');
    } catch (error) {
      setScannerError(normalizeQrError(error));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function submitConfirmation() {
    const token = activeToken();
    if (!token || confirming()) return;
    setConfirming(true);
    setConfirmError('');
    try {
      const result = await confirmLoanQr(token);
      setPreview(null);
      setActiveToken('');
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'dashboard', 'summary'],
      });
      notify(result.message ?? 'Buku berhasil Dipinjam', 'success');
    } catch (error) {
      setConfirmError(
        error instanceof Error
          ? error.message
          : 'Konfirmasi peminjaman gagal. Silakan coba lagi.',
      );
    } finally {
      setConfirming(false);
    }
  }

  createEffect(() => {
    if (scannerOpen()) {
      scanAttempt();
      queueMicrotask(() => void startScanner());
    }
  });

  onCleanup(() => {
    void stopScanner();
    setActiveToken('');
  });

  const summary = () => summaryQuery.data ?? EMPTY_DASHBOARD_SUMMARY;
  const distribution = () => getReturnDistribution(summary().pieChart);
  const onTimeShare = () => distribution().onTimePercentage;
  const returnedTransactions = () => distribution().total;
  const chartBackground = () =>
    distribution().total === 0
      ? 'conic-gradient(var(--dashboard-chart-empty) 0% 100%)'
      : `conic-gradient(var(--dashboard-primary) 0% ${onTimeShare()}%, var(--dashboard-chart-late) ${onTimeShare()}% 100%)`;

  return (
    <div class="dashboard-app">
      <AdminHeader activeSection="dashboard" />

      <main class="dashboard-main">
        <section class="dashboard-heading" aria-labelledby="dashboard-title">
          <div class="dashboard-heading__copy">
            <h1 id="dashboard-title">Dashboard</h1>
            <p>Ringkasan laporan perpustakaan · {reportDate}</p>
          </div>

          <div class="dashboard-heading__actions">
            <button
              class="dashboard-scan-button"
              type="button"
              aria-label="Scan QR"
              onClick={openScanner}
            >
              <svg
                class="dashboard-scan-button__icon"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M2 2h6v6H2zM12 2h6v6h-6zM2 12h6v6H2z" />
                <path d="M13 12h2v2h-2zM17 12v2M12 17h2M16 16h2v2h-2z" />
              </svg>
              Scan QR
            </button>
          </div>
        </section>

        <Show when={summaryQuery.isLoading}>
          <section class="dashboard-state" role="status">
            <span class="dashboard-loader" />
            Memuat ringkasan dashboard…
          </section>
        </Show>

        <Show when={summaryQuery.isError}>
          <section class="dashboard-state dashboard-state--error" role="alert">
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : ''}
          </section>
        </Show>

        <section
          class="dashboard-metrics"
          aria-label="Ringkasan peminjaman buku"
        >
          <For each={METRIC_CARDS}>
            {(metric) => (
              <article class="dashboard-metric-card">
                <h2>{metric.label}</h2>

                <p class="dashboard-metric-card__value">
                  {numberFormatter.format(metric.value(summary()))}
                </p>

                <p class="dashboard-metric-card__description">
                  {metric.description}
                </p>
              </article>
            )}
          </For>
        </section>

        <section
          class="dashboard-chart-card"
          aria-label="Ketepatan Pengembalian"
        >
          <div class="dashboard-chart-heading">
            <h2>Ketepatan Pengembalian</h2>

            <p>
              Dari {numberFormatter.format(returnedTransactions())} transaksi
              yang sudah dikembalikan
            </p>
          </div>

          <div class="dashboard-chart-content">
            <div
              class="dashboard-pie-chart"
              role="img"
              aria-label={`Pengembalian tepat waktu ${numberFormatter.format(summary().pieChart.onTime)}, pengembalian terlambat ${numberFormatter.format(summary().pieChart.late)}.`}
              style={{ background: chartBackground() }}
            />

            <fieldset
              class="dashboard-chart-legend"
              aria-label="Keterangan grafik"
            >
              <div class="dashboard-chart-legend__item">
                <span
                  class="dashboard-chart-legend__dot dashboard-chart-legend__dot--on-time"
                  aria-hidden="true"
                />

                <div class="dashboard-chart-legend__copy">
                  <span>Pengembalian tepat waktu</span>
                  <small>
                    {numberFormatter.format(summary().pieChart.onTime)}
                    {'·'}
                    transaksi
                  </small>
                </div>

                <strong>
                  {percentFormatter.format(distribution().onTimePercentage)}%
                </strong>
              </div>

              <div class="dashboard-chart-legend__item">
                <span
                  class="dashboard-chart-legend__dot dashboard-chart-legend__dot--late"
                  aria-hidden="true"
                />

                <div class="dashboard-chart-legend__copy">
                  <span>Pengembalian terlambat</span>
                  <small>
                    {numberFormatter.format(summary().pieChart.late)} transaksi
                  </small>
                </div>

                <strong>
                  {percentFormatter.format(distribution().latePercentage)}%
                </strong>
              </div>
            </fieldset>
          </div>
        </section>
      </main>

      <Show when={scannerOpen()}>
        <Modal
          title="Scan QR Code"
          onClose={() => void closeScanner()}
          class="dashboard-modal dashboard-scanner-modal"
        >
          <Show when={scannerError()}>
            <p class="dashboard-scan-error" role="alert">
              {scannerError()}
            </p>
          </Show>
          <div class="dashboard-viewfinder">
            <div class="dashboard-viewfinder__frame">
              <div
                id="dashboard-qr-reader"
                ref={(element) => {
                  scannerElement = element;
                }}
              />
              <span class="dashboard-viewfinder__corner dashboard-viewfinder__corner--tl" />
              <span class="dashboard-viewfinder__corner dashboard-viewfinder__corner--tr" />
              <span class="dashboard-viewfinder__corner dashboard-viewfinder__corner--bl" />
              <span class="dashboard-viewfinder__corner dashboard-viewfinder__corner--br" />
              <span class="dashboard-viewfinder__scan-line" />
            </div>
          </div>
          <Show when={cameraStarting()}>
            <p class="dashboard-scanner-status" role="status">
              Mengaktifkan kamera…
            </p>
          </Show>
          <p class="dashboard-scanner-help">
            Arahkan QR Code peminjaman ke dalam bingkai kamera.
          </p>
          <button
            type="button"
            class="text-button dashboard-manual-trigger"
            onClick={() => {
              void stopScanner();
              setManualToken('');
              setManualOpen(true);
            }}
          >
            Masukkan kode peminjaman secara manual
          </button>
        </Modal>
      </Show>

      <Show when={manualOpen()}>
        <Modal
          title="Masukkan Kode Peminjaman"
          onClose={() => {
            setManualOpen(false);
            if (scannerOpen()) setScanAttempt((value) => value + 1);
          }}
          class="dashboard-modal"
        >
          <form onSubmit={submitManualToken}>
            <label class="dashboard-manual-label" for="manual-loan-token">
              Kode QR / token peminjaman
            </label>
            <input
              id="manual-loan-token"
              class="dashboard-manual-input"
              type="text"
              value={manualToken()}
              onInput={(event) => setManualToken(event.currentTarget.value)}
              autocomplete="off"
              required
            />
            <Show when={scannerError()}>
              <p class="dashboard-scan-error" role="alert">
                {scannerError()}
              </p>
            </Show>
            <div class="form-actions">
              <button
                type="button"
                class="button secondary"
                onClick={() => {
                  setManualOpen(false);
                  if (scannerOpen()) setScanAttempt((value) => value + 1);
                }}
              >
                Batal
              </button>
              <button type="submit" class="button" disabled={previewLoading()}>
                {previewLoading() ? 'Memeriksa…' : 'Lanjutkan'}
              </button>
            </div>
          </form>
        </Modal>
      </Show>

      <Show when={preview()}>
        {(item) => (
          <Modal
            title="Konfirmasi Peminjaman"
            onClose={() => {
              if (!confirming()) {
                setPreview(null);
                setActiveToken('');
              }
            }}
            class="dashboard-modal dashboard-confirm-modal"
          >
            <div class="dashboard-confirm-borrower">
              <span class="dashboard-detail-label">Nama Peminjam</span>
              <strong>{item().borrower_name}</strong>
              <span class="dashboard-detail-label">Nomor Pinjaman</span>
              <strong>{item().loan_no}</strong>
              <span class="dashboard-detail-label">Tanggal Permintaan</span>
              <strong>
                {requestedAtFormatter.format(new Date(item().requested_at))}
              </strong>
              <span class="dashboard-detail-label">Durasi Peminjaman</span>
              <strong>{item().loan_duration_days} hari</strong>
            </div>
            <div class="dashboard-confirm-book">
              <Show
                when={item().book.cover_url}
                fallback={
                  <div class="dashboard-confirm-book__placeholder">
                    Cover tidak tersedia
                  </div>
                }
              >
                <img
                  src={item().book.cover_url ?? undefined}
                  alt={`Cover ${item().book.title}`}
                />
              </Show>
              <div>
                <h3>{item().book.title}</h3>
                <p>{item().book.author}</p>
                <p>
                  {item().book.publisher} · {item().book.publication_year}
                </p>
                <p>{item().book.genres.join(', ') || 'Genre tidak tersedia'}</p>
              </div>
            </div>
            <Show when={confirmError()}>
              <p class="dashboard-scan-error" role="alert">
                {confirmError()}
              </p>
            </Show>
            <p class="dashboard-confirm-note">
              Stok buku dan status peminjaman hanya berubah setelah Admin
              menekan tombol konfirmasi.
            </p>
            <div class="form-actions">
              <button
                type="button"
                class="button secondary"
                disabled={confirming()}
                onClick={() => {
                  setPreview(null);
                  setActiveToken('');
                }}
              >
                Batal
              </button>
              <button
                type="button"
                class="button"
                disabled={confirming()}
                onClick={() => void submitConfirmation()}
              >
                {confirming() ? 'Memproses…' : 'Konfirmasi Peminjaman'}
              </button>
            </div>
          </Modal>
        )}
      </Show>
    </div>
  );
}
