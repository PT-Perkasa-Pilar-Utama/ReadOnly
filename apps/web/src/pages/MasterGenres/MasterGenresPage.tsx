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
      !window.confirm(`Apakah Anda yakin menonaktifkan genre ${genre.name}?`)
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
    if (!window.confirm(`Apakah Anda yakin menghapus genre ${genre.name}?`)) {
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

        <section class="master-genres-panel" aria-label="Daftar genre">
          <div class="master-genres-toolbar">
            <label class="master-genres-search">
              <span>Cari Genre</span>
              <input
                type="search"
                value={searchText()}
                onInput={(event) => {
                  setSearchText(event.currentTarget.value);
                  setPage(1);
                }}
                placeholder="Cari nama genre"
                aria-label="Cari nama genre"
              />
            </label>
          </div>

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
                          <td>{genre.book_count}</td>
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
                                class="master-genres-action"
                                onClick={() => openEdit(genre)}
                                disabled={busyGenreId() === genre.id}
                              >
                                Edit
                              </button>
                              <Show
                                when={genre.status === 'active'}
                                fallback={
                                  <button
                                    type="button"
                                    class="master-genres-action"
                                    onClick={() =>
                                      void changeStatus(genre, 'active')
                                    }
                                    disabled={busyGenreId() === genre.id}
                                  >
                                    Aktifkan
                                  </button>
                                }
                              >
                                <button
                                  type="button"
                                  class="master-genres-action"
                                  onClick={() =>
                                    void changeStatus(genre, 'inactive')
                                  }
                                  disabled={busyGenreId() === genre.id}
                                >
                                  Nonaktifkan
                                </button>
                              </Show>
                              <button
                                type="button"
                                class={
                                  'master-genres-action master-genres-action--delete'
                                }
                                onClick={() => void removeGenre(genre)}
                                disabled={busyGenreId() === genre.id}
                              >
                                Hapus
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
