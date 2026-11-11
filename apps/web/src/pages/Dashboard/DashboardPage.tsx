import { createQuery } from '@tanstack/solid-query';
import { For, Show } from 'solid-js';
import {
  type DashboardSummary,
  getDashboardSummary,
  getReturnDistribution,
} from '../../api/dashboard';
import { AdminHeader } from '../../components/AdminHeader';
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

export function DashboardPage() {
  const summaryQuery = createQuery(() => ({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: ({ signal }) => getDashboardSummary(signal),
    staleTime: 30_000,
  }));

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
              disabled
              title="Pemindai QR menunggu penetapan pustaka pada keputusan Q-18"
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
                    {numberFormatter.format(summary().pieChart.onTime)} transaksi
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
    </div>
  );
}
