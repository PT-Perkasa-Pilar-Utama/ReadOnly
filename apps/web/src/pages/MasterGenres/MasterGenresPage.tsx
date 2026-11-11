import type { GenreStatus } from '@readonly/shared';
import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { createSignal, For, Show } from 'solid-js';
import {
  type AdminGenreItem,
  createAdminGenre,
  deleteAdminGenre,
  getAdminGenreList,
  getGenreFormError,
  updateAdminGenre,
} from '../../api/genres';
import { AdminHeader } from '../../components/AdminHeader';
import { requestAdminConfirmation } from '../../components/admin-feedback-store';
import { ErrorNotice, Loading, notify } from '../../components/Feedback';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { debounced } from '../../lib/debounced';
import './MasterGenresPage.css';

interface GenreFormModalProps {
  genre: AdminGenreItem | undefined;
  onClose: () => void;
  onSaved: () => void;
}

function GenreFormModal(props: GenreFormModalProps) {
  const [name, setName] = createSignal(props.genre?.name ?? '');
  const [error, setError] = createSignal('');
  const [saving, setSaving] = createSignal(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const normalizedName = name().trim();

    if (!normalizedName) {
      setError('Field harus diisi!');
      return;
    }
    if (saving()) return;

    setSaving(true);
    setError('');
    try {
      if (props.genre) {
        await updateAdminGenre(props.genre.id, { name: normalizedName });
        notify('Genre berhasil diubah', 'success');
      } else {
        await createAdminGenre(normalizedName);
        notify('Genre berhasil ditambahkan', 'success');
      }
      props.onSaved();
    } catch (reason) {
      setError(getGenreFormError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={props.genre ? 'Edit Genre' : 'Tambah Genre'}
      onClose={() => {
        if (!saving()) props.onClose();
      }}
      class="master-genres-modal"
    >
      <form onSubmit={submit}>
        <label class="master-genres-form-field">
          <span>
            Nama Genre <strong aria-hidden="true">*</strong>
          </span>
          <input
            type="text"
            value={name()}
            onInput={(event) => {
              setName(event.currentTarget.value);
              setError('');
            }}
            aria-invalid={Boolean(error())}
            aria-describedby={error() ? 'genre-name-error' : undefined}
            placeholder="Masukkan nama genre"
          />
          <Show when={error()}>
            <small
              id="genre-name-error"
              class="master-genres-inline-error"
              role="alert"
            >
              {error()}
            </small>
          </Show>
        </label>

        <div class="form-actions">
          <button
            class="button secondary"
            type="button"
            onClick={props.onClose}
            disabled={saving()}
          >
            Batal
          </button>
          <button class="button" type="submit" disabled={saving()}>
            {saving() ? 'Menyimpan…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MasterGenresPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = createSignal('');
  const searchTerm = debounced(searchText);
  const [page, setPage] = createSignal(1);
  const [formGenre, setFormGenre] = createSignal<AdminGenreItem | null>(null);
  const [formOpen, setFormOpen] = createSignal(false);
  const [busyGenreId, setBusyGenreId] = createSignal<string | null>(null);

  const genresQuery = createQuery(() => ({
    queryKey: ['admin', 'genres', searchTerm(), page()],
    queryFn: ({ signal }) =>
      getAdminGenreList({ q: searchTerm(), page: page(), limit: 10 }, signal),
  }));

  function applySearch() {
    setPage(1);
    void genresQuery.refetch();
  }

  async function refreshGenreConsumers() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'genres'] }),
      queryClient.invalidateQueries({
        queryKey: ['admin', 'book-genre-options'],
      }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] }),
      queryClient.invalidateQueries({ queryKey: ['genres'] }),
      queryClient.invalidateQueries({ queryKey: ['books'] }),
      queryClient.invalidateQueries({ queryKey: ['book'] }),
    ]);
  }

  function openCreate() {
    setFormGenre(null);
    setFormOpen(true);
  }

  function openEdit(genre: AdminGenreItem) {
    setFormGenre(genre);
    setFormOpen(true);
  }

  async function saveForm() {
    const wasCreating = formGenre() === null;
    setFormOpen(false);
    if (wasCreating) {
      setSearchText('');
      setPage(1);
    }
    await refreshGenreConsumers();
  }

  async function changeStatus(genre: AdminGenreItem, status: GenreStatus) {
    if (busyGenreId()) return;

    if (
      status === 'inactive' &&
      !(await requestAdminConfirmation(
        `Apakah Anda yakin menonaktifkan genre ${genre.name}?`,
      ))
    ) {
      return;
    }

    setBusyGenreId(genre.id);
    try {
      await updateAdminGenre(genre.id, { status });
      notify(
        status === 'active'
          ? 'Genre berhasil diaktifkan'
          : 'Genre berhasil dinonaktifkan',
        'success',
      );
      await refreshGenreConsumers();
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : 'Genre gagal diperbarui.',
        'error',
      );
    } finally {
      setBusyGenreId(null);
    }
  }

  async function removeGenre(genre: AdminGenreItem) {
    if (busyGenreId()) return;
    if (
      !(await requestAdminConfirmation(
        `Apakah Anda yakin menghapus genre ${genre.name}?`,
      ))
    ) {
      return;
    }

    setBusyGenreId(genre.id);
    try {
      await deleteAdminGenre(genre.id);
      notify('Genre berhasil dihapus', 'success');

      if ((genresQuery.data?.genres.length ?? 0) === 1 && page() > 1) {
        setPage(page() - 1);
      }
      await refreshGenreConsumers();
    } catch (reason) {
      notify(
        reason instanceof Error
          ? reason.message
          : 'Genre tidak dapat dihapus karena masih digunakan. ' +
              'Nonaktifkan genre jika tidak ingin dipakai lagi.',
        'error',
      );
    } finally {
      setBusyGenreId(null);
    }
  }

  return (
    <div class="master-genres-app">
      <AdminHeader activeSection="genres" />

      <main class="master-genres-main">
        <section class="master-genres-heading">
          <div>
            <h1>Master Genre</h1>
            <p class="master-genres-subtitle">Kelola genre buku perpustakaan</p>
          </div>
          <button
            class="master-genres-button master-genres-button--primary"
            type="button"
            onClick={openCreate}
          >
            <span aria-hidden="true">+</span> Add
          </button>
        </section>

        <fieldset class="master-genres-toolbar" aria-label="Filter genre">
          <label class="master-genres-search">
            <span>Nama Genre</span>
            <input
              type="search"
              value={searchText()}
              onInput={(event) => {
                setSearchText(event.currentTarget.value);
                setPage(1);
              }}
              placeholder="Masukkan nama genre"
              aria-label="Cari nama genre"
            />
          </label>
          <button
            class="master-genres-button master-genres-button--filter"
            type="button"
            onClick={applySearch}
            disabled={genresQuery.isPending}
          >
            Set Filter
          </button>
        </fieldset>

        <section class="master-genres-panel" aria-label="Daftar genre">
          <Show when={genresQuery.isPending}>
            <Loading label="Memuat daftar genre…" />
          </Show>

          <Show when={genresQuery.isError}>
            <div class="master-genres-state master-genres-state--error">
              <ErrorNotice
                error={genresQuery.error}
                retry={() => void genresQuery.refetch()}
              />
            </div>
          </Show>

          <Show when={!genresQuery.isPending && !genresQuery.isError}>
            <div class="master-genres-table-wrap">
              <table class="master-genres-table">
                <thead>
                  <tr>
                    <th scope="col">Nama Genre</th>
                    <th scope="col">Jumlah Buku</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={(genresQuery.data?.genres.length ?? 0) > 0}
                    fallback={
                      <tr>
                        <td colSpan={4} class="master-genres-empty">
                          {searchTerm()
                            ? 'Genre tidak ditemukan'
                            : 'Belum ada genre.'}
                        </td>
                      </tr>
                    }
                  >
                    <For each={genresQuery.data?.genres ?? []}>
                      {(genre) => (
                        <tr>
                          <td class="master-genres-name">{genre.name}</td>
                          <td>{genre.book_count} buku</td>
                          <td>
                            <span
                              class={`master-genres-status master-genres-status--${
                                genre.status
                              }`}
                            >
                              {genre.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td>
                            <div class="master-genres-actions">
                              <button
                                type="button"
                                class="master-genres-action master-genres-action--icon"
                                onClick={() => openEdit(genre)}
                                disabled={busyGenreId() === genre.id}
                                aria-label={`Edit ${genre.name}`}
                                title="Edit"
                              >
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M3.5 13.9 13.7 3.7a1.8 1.8 0 0 1 2.6 0l.1.1a1.8 1.8 0 0 1 0 2.6L6.2 16.6l-3.1.8z" />
                                  <path d="m11.9 5.5 2.6 2.6M3.1 17.4l3.1-.8" />
                                </svg>
                              </button>
                              <Show
                                when={genre.status === 'active'}
                                fallback={
                                  <button
                                    type="button"
                                    class="master-genres-action master-genres-action--icon"
                                    onClick={() =>
                                      void changeStatus(genre, 'active')
                                    }
                                    disabled={busyGenreId() === genre.id}
                                    aria-label={`Aktifkan ${genre.name}`}
                                    title="Aktifkan"
                                  >
                                    <svg viewBox="0 0 20 20" aria-hidden="true">
                                      <rect
                                        x="2.5"
                                        y="5.5"
                                        width="15"
                                        height="9"
                                        rx="4.5"
                                      />
                                      <circle cx="7.5" cy="10" r="2.5" />
                                    </svg>
                                  </button>
                                }
                              >
                                <button
                                  type="button"
                                  class="master-genres-action master-genres-action--icon"
                                  onClick={() =>
                                    void changeStatus(genre, 'inactive')
                                  }
                                  disabled={busyGenreId() === genre.id}
                                  aria-label={`Nonaktifkan ${genre.name}`}
                                  title="Nonaktifkan"
                                >
                                  <svg viewBox="0 0 20 20" aria-hidden="true">
                                    <rect
                                      x="2.5"
                                      y="5.5"
                                      width="15"
                                      height="9"
                                      rx="4.5"
                                    />
                                    <circle cx="12.5" cy="10" r="2.5" />
                                  </svg>
                                </button>
                              </Show>
                              <button
                                type="button"
                                class={
                                  'master-genres-action master-genres-action--icon master-genres-action--delete'
                                }
                                onClick={() => void removeGenre(genre)}
                                disabled={busyGenreId() === genre.id}
                                aria-label={`Hapus ${genre.name}`}
                                title="Hapus"
                              >
                                <svg viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M4 5.5h12M7.2 5.5V3.8h5.6v1.7m-7.2 0 .7 10.8h6.9l.7-10.8M8 8.2v5.5m4-5.5v5.5" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </table>
            </div>

            <Pagination
              pagination={
                genresQuery.data?.pagination ?? {
                  page: 1,
                  limit: 10,
                  total: 0,
                  totalPages: 0,
                }
              }
              noun="genre"
              onChange={setPage}
            />
          </Show>
        </section>
      </main>

      <Show when={formOpen()}>
        <GenreFormModal
          genre={formGenre() ?? undefined}
          onClose={() => setFormOpen(false)}
          onSaved={() => void saveForm()}
        />
      </Show>
    </div>
  );
}
