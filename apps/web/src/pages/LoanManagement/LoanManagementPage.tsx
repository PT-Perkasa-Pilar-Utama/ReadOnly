import { createQuery } from '@tanstack/solid-query';
import { useNavigate } from '@tanstack/solid-router';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import {
  ADMIN_LOAN_STATUSES,
  formatLoanDate,
  getAdminLoans,
  getLoanStatusClass,
  getLoanStatusLabel,
  type AdminLoanStatus,
} from '../../api/loans';
import { AdminHeader } from '../../components/AdminHeader';
import './LoanManagementPage.css';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function LoanManagementPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [selectedStatus, setSelectedStatus] = createSignal('');
  const [appliedStatus, setAppliedStatus] = createSignal<AdminLoanStatus | ''>('');
  const [page, setPage] = createSignal(1);

  createEffect(() => {
    const value = searchText().trim();
    const timeoutId = window.setTimeout(() => setDebouncedSearch(value), 250);
    onCleanup(() => window.clearTimeout(timeoutId));
  });

  createEffect(() => {
    debouncedSearch();
    setPage(1);
  });

  
  const loansQuery = createQuery(() => ({
    queryKey: ['admin', 'loans', 'list', debouncedSearch(), appliedStatus(), page()],
    queryFn: ({ signal }) => {
      const search = debouncedSearch();
      const status = appliedStatus();

      return getAdminLoans(
        {
          ...(search ? { q: search } : {}),
          ...(status !== '' ? { status } : {}),
          page: page(),
          limit: 10,
        },
        signal,
      );
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  }));


  function applyFilters() {
    setAppliedStatus(selectedStatus() as AdminLoanStatus | '');
    setPage(1);
  }

  const currentPage = () => loansQuery.data?.pagination.page ?? page();
  const totalPages = () => loansQuery.data?.pagination.totalPages ?? 0;
  const totalLoans = () => loansQuery.data?.pagination.total ?? 0;
  const visiblePageNumbers = () => {
    const total = totalPages();
    const current = currentPage();
    const start = Math.max(1, Math.min(current - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
  };

  return (
    <div class="loan-management-app">
      <AdminHeader activeSection="loans" />

      <main class="loan-management-main">
        <section class="loan-management-heading">
          <div>
            <h1>Manajemen Peminjaman</h1>
            <p>Kelola dan pantau peminjaman buku perpustakaan</p>
          </div>
        </section>

        <section class="loan-management-panel" aria-label="Daftar peminjaman">
          <div class="loan-management-toolbar">
            <label class="loan-management-search">
              <span>Cari Peminjaman</span>
              <input
                type="search"
                value={searchText()}
                onInput={(event) => setSearchText(event.currentTarget.value)}
                placeholder="Cari nomor peminjaman, nama peminjam, atau judul buku"
                aria-label="Cari nomor peminjaman, nama peminjam, atau judul buku"
              />
            </label>

            <label class="loan-management-filter">
              <span>Status</span>
              <select
                value={selectedStatus()}
                onChange={(event) => setSelectedStatus(event.currentTarget.value)}
                aria-label="Filter status peminjaman"
              >
                <option value="">Semua Status</option>
                <For each={ADMIN_LOAN_STATUSES}>
                  {(status) => <option value={status}>{getLoanStatusLabel(status)}</option>}
                </For>
              </select>
            </label>

            <button
              class="loan-management-button loan-management-button--primary"
              type="button"
              onClick={applyFilters}
              disabled={loansQuery.isPending}
            >
              Set Filter
            </button>
          </div>

          <Show when={loansQuery.isPending}>
            <div class="loan-management-state" aria-live="polite" aria-busy="true">
              <span class="loan-management-loader" aria-hidden="true" />
            </div>
          </Show>

          <Show when={loansQuery.isError}>
            <div class="loan-management-state loan-management-state--error" role="alert">
              {getErrorMessage(loansQuery.error)}
            </div>
          </Show>

          <Show when={!loansQuery.isPending && !loansQuery.isError}>
            <div class="loan-management-table-wrap">
              <table class="loan-management-table">
                <thead>
                  <tr>
                    <th scope="col">Buku</th>
                    <th scope="col">Peminjam</th>
                    <th scope="col">Tanggal Peminjaman</th>
                    <th scope="col">Batas Pengembalian</th>
                    <th scope="col">Status</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={(loansQuery.data?.loans.length ?? 0) > 0}
                    fallback={
                      <tr>
                        <td class="loan-management-empty" colSpan={6}>
                          Tidak ada data peminjaman
                        </td>
                      </tr>
                    }
                  >
                    <For each={loansQuery.data?.loans ?? []}>
                      {(loan) => (
                        <tr>
                          <td>
                            <div class="loan-book-cell">
                              <div class="loan-book-cover">
                                <Show
                                  when={loan.book_cover_url}
                                  fallback={<span aria-hidden="true">▤</span>}
                                >
                                  <img src={loan.book_cover_url ?? ''} alt={`Cover ${loan.book_title}`} />
                                </Show>
                              </div>
                              <div class="loan-book-meta">
                                <strong>{loan.book_title}</strong>
                                <small>{loan.loan_no}</small>
                              </div>
                            </div>
                          </td>
                          <td>{loan.borrower_name}</td>
                          <td>{formatLoanDate(loan.confirmed_at)}</td>
                          <td>{formatLoanDate(loan.due_date)}</td>
                          <td>
                            <span class={`loan-status-badge ${getLoanStatusClass(loan.status)}`}>
                              {getLoanStatusLabel(loan.status, loan.status_label)}
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

            <div class="loan-management-footer">
              <p>
                Menampilkan {loansQuery.data?.loans.length ?? 0} dari {totalLoans()} peminjaman
              </p>
              <nav class="loan-management-pagination" aria-label="Paginasi daftar peminjaman">
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
                      aria-current={pageNumber === currentPage() ? 'page' : undefined}
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
                  onClick={() => setPage((value) => Math.min(totalPages(), value + 1))}
                >
                  ›
                </button>
              </nav>
            </div>
          </Show>
        </section>
      </main>
    </div>
  );
}
