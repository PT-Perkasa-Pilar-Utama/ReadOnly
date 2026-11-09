import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '@readonly/shared';
import { createQuery } from '@tanstack/solid-query';
import { Link } from '@tanstack/solid-router';
import { createSignal, For, Show } from 'solid-js';
import type { User } from '@web/api/contracts';
import { getUsers, setUserStatus } from '@web/api/users';
import { ErrorNotice, Loading, notify } from '@web/components/Feedback';
import Icon from '@web/components/Icon';
import Modal from '@web/components/Modal';
import Pagination from '@web/components/Pagination';
import { debounced } from '@web/lib/debounced';
import { queryClient } from '@web/lib/query';
import { currentUser } from '@web/lib/session';

export default function UsersPage() {
  const [search, setSearch] = createSignal('');
  const keyword = debounced(search);
  const [role, setRole] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [confirm, setConfirm] = createSignal<User | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [failure, setFailure] = createSignal<unknown>();
  const users = createQuery(() => ({
    queryKey: ['users', keyword(), role(), page()],
    queryFn: ({ signal }) =>
      getUsers({ q: keyword(), role: role(), page: page() }, signal),
  }));
  async function changeStatus(user: User) {
    // AC-12.06, AC-12.08: ubah status dan invalidasi cache setelah API berhasil.
    if (busy()) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const result = await setUserStatus(
        user.id,
        user.status === 'active' ? 'inactive' : 'active',
      );
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      setConfirm(null);
      notify(
        result.message ??
          (user.status === 'active'
            ? 'Akun berhasil dinonaktifkan'
            : 'Akun berhasil diaktifkan'),
      );
    } catch (error) {
      setConfirm(null);
      setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main class="page-container">
      <header class="section-heading">
        <div>
          <span class="eyebrow">ADMIN PERPUS</span>
          <h1>Management User</h1>
          <p>Kelola akun Admin dan Member perpustakaan.</p>
        </div>
        <Link to="/admin/users/add" class="button">
          <Icon name="plus" size={17} />
          Add Admin
        </Link>
      </header>
      <Show when={failure()}>
        <ErrorNotice error={failure()} />
      </Show>
      {/* AC-12.01, AC-12.11: tabel, pencarian nama/email, filter role, dan hasil kosong. */}
      <div class="user-toolbar">
        <div class="search-field">
          <label for="user-search" class="sr-only">
            Cari user
          </label>
          <Icon name="search" size={19} />
          <input
            id="user-search"
            type="search"
            value={search()}
            onInput={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
            placeholder="Cari nama atau email"
          />
        </div>
        <div class="role-filter">
          <label for="role-filter">Role</label>
          <select
            id="role-filter"
            value={role()}
            onChange={(event) => {
              setRole(event.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">Semua Role</option>
            <option value="admin">Admin Perpus</option>
            <option value="member">Member</option>
          </select>
        </div>
      </div>
      <Show when={users.isPending}>
        <Loading />
      </Show>
      <Show when={users.isError}>
        <ErrorNotice error={users.error} retry={() => void users.refetch()} />
      </Show>
      <Show when={users.data} keyed>
        {(data) => (
          <>
            <div class="table-container">
              <table class="users-table">
                <caption class="sr-only">Daftar user perpustakaan</caption>
                <thead>
                  <tr>
                    <th scope="col">Nama Lengkap</th>
                    <th scope="col">Email</th>
                    <th scope="col">Nomor Ponsel</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={data.data}
                    fallback={
                      <tr>
                        <td colspan={6}>
                          <div class="empty-state">
                            <Icon name="users" size={30} />
                            <p>User tidak ditemukan</p>
                          </div>
                        </td>
                      </tr>
                    }
                  >
                    {(user) => (
                      <tr>
                        <td>
                          <strong>{user.full_name}</strong>
                          <Show when={user.id === currentUser()?.id}>
                            <span class="self-label">Anda</span>
                          </Show>
                        </td>
                        <td>{user.email}</td>
                        <td>{user.phone_number}</td>
                        <td>{USER_ROLE_LABELS[user.role]}</td>
                        <td>
                          <span
                            class={`badge ${user.status === 'active' ? 'available' : 'unavailable'}`}
                          >
                            {USER_STATUS_LABELS[user.status]}
                          </span>
                        </td>
                        <td>
                          <div class="row-actions">
                            <Link
                              to="/admin/users/$userId/edit"
                              params={{ userId: user.id }}
                              class="icon-button edit-action"
                              aria-label={`Edit ${user.full_name}`}
                            >
                              <Icon name="edit" size={17} />
                            </Link>
                            {/* AC-12.09: akun sendiri tidak dapat dinonaktifkan; AC-12.10 ditangani dari error API. */}
                            <button
                              type="button"
                              class="status-action"
                              disabled={busy() || user.id === currentUser()?.id}
                              onClick={() => {
                                if (user.status === 'active') setConfirm(user);
                                else void changeStatus(user);
                              }}
                              aria-label={`${user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'} ${user.full_name}`}
                            >
                              {user.status === 'active'
                                ? 'Nonaktifkan'
                                : 'Aktifkan'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={data.pagination}
              noun="user"
              onChange={setPage}
            />
          </>
        )}
      </Show>
      <Show when={confirm()}>
        {(user) => (
          <Modal
            title="Nonaktifkan akun"
            onClose={() => {
              if (!busy()) setConfirm(null);
            }}
          >
            <p class="confirmation-copy">
              Apakah Anda yakin menonaktifkan akun {user().full_name}?
            </p>
            <div class="form-actions">
              <button
                class="button secondary"
                type="button"
                disabled={busy()}
                onClick={() => setConfirm(null)}
              >
                Batal
              </button>
              <button
                class="button"
                type="button"
                disabled={busy()}
                onClick={() => void changeStatus(user())}
              >
                {busy() ? 'Memproses…' : 'OK'}
              </button>
            </div>
          </Modal>
        )}
      </Show>
    </main>
  );
}
