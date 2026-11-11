import { createQuery } from '@tanstack/solid-query';
import { useNavigate } from '@tanstack/solid-router';
import { createSignal, For, Show } from 'solid-js';
import {
  formatLoanDate,
  getAdminLoans,
  getLoanStatusClass,
  getLoanStatusLabel,
} from '../../api/loans';
import { AdminHeader } from '../../components/AdminHeader';
import './LoanManagementPage.css';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function LoanManagementPage() {
  const navigate = useNavigate();
  const [page, setPage] = createSignal(1);

  const loansQuery = createQuery(() => ({
    queryKey: ['admin', 'loans', 'list', page()],
    queryFn: ({ signal }) => getAdminLoans({ page: page(), limit: 10 }, signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  }));

  const currentPage = () => loansQuery.data?.pagination.page ?? page();
  const totalPages = () => loansQuery.data?.pagination.totalPages ?? 0;
  const totalLoans = () => loansQuery.data?.pagination.total ?? 0;
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
    <div class="loan-management-app">
      <AdminHeader activeSection="loans" />

      <main class="loan-management-main loan-management-main--list">
        <section class="loan-management-heading">
          <div>
            <h1>Manajemen Peminjaman</h1>
            <p>Periksa status peminjaman dan proses pengembalian buku.</p>
          </div>
        </section>

        <section class="loan-management-panel" aria-label="Daftar peminjaman">
          <Show when={loansQuery.isPending}>
            <div
              class="loan-management-state"
              aria-live="polite"
              aria-busy="true"
            >
              <span class="loan-management-loader" aria-hidden="true" />
            </div>
          </Show>

          <Show when={loansQuery.isError}>
            <div
              class="loan-management-state loan-management-state--error"
              role="alert"
            >
              {getErrorMessage(loansQuery.error)}
            </div>
          </Show>

          <Show when={!loansQuery.isPending && !loansQuery.isError}>
            <div class="loan-management-table-wrap">
              <table class="loan-management-table">
                <thead>
                  <tr>
                    <th scope="col">Cover</th>
                    <th scope="col">Judul Buku</th>
                    <th scope="col">Nama Peminjam</th>
                    <th scope="col">Tanggal Peminjaman</th>
                    <th scope="col">Batas Pengembalian</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={(loansQuery.data?.loans.length ?? 0) > 0}
                    fallback={
                      <tr>
                        <td class="loan-management-empty" colSpan={7}>
                          Tidak ada data peminjaman
                        </td>
                      </tr>
                    }
                  >
                    <For each={loansQuery.data?.loans ?? []}>
                      {(loan) => (
                        <tr>
                          <td>
                            <div class="loan-book-cover">
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
                          </td>
                          <td class="loan-book-title">{loan.book_title}</td>
                          <td>{loan.borrower_name}</td>
                          <td>{formatLoanDate(loan.confirmed_at)}</td>
                          <td>{formatLoanDate(loan.due_date)}</td>
                          <td>
                            <span
                              class={`loan-status-badge ${getLoanStatusClass(loan.status)}`}
                            >
                              {getLoanStatusLabel(
                                loan.status,
                                loan.status_label,
                              )}
                            </span>
                          </td>
                          <td>
                            <button
                              class="loan-management-detail-button"
                              type="button"
                              aria-label={`Lihat detail ${loan.loan_no}`}
                              title="Detail"
                              onClick={() =>
                                void navigate({
                                  to: '/admin/loans/$loanId',
                                  params: { loanId: loan.id },
                                })
                              }
                            >
                              <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M1.8 10s2.8-5 8.2-5 8.2 5 8.2 5-2.8 5-8.2 5-8.2-5-8.2-5Z" />
                                <circle cx="10" cy="10" r="2.1" />
                              </svg>
                            </button>
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

        <Show when={!loansQuery.isPending && !loansQuery.isError}>
          <div class="loan-management-footer">
            <p>
              Menampilkan {loansQuery.data?.loans.length ?? 0} dari{' '}
              {totalLoans()} peminjaman.
            </p>
            <nav
              class="loan-management-pagination"
              aria-label="Paginasi daftar peminjaman"
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
