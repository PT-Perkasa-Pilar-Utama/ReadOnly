import { Link, Outlet, useNavigate } from '@tanstack/solid-router';
import { createSignal, Show } from 'solid-js';
import { currentUser, endSession } from '../lib/session';
import DemoBanner from './DemoBanner';
import { notify } from './Feedback';
import Icon from './Icon';
import { NotificationsMenu, ReminderHost } from './Notifications';

export default function AppLayout() {
  const navigate = useNavigate();
  const [busy, setBusy] = createSignal(false);
  async function signOut() {
    if (busy()) return;
    setBusy(true);
    try {
      await endSession();
      await navigate({ to: '/login', replace: true });
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Logout gagal. Silakan coba lagi.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DemoBanner />
      <header class="app-header">
        <div class="header-inner">
          <Link
            to={currentUser()?.role === 'admin' ? '/dashboard' : '/home'}
            class="wordmark"
          >
            ReadOnly
          </Link>
          <nav class="main-nav" aria-label="Navigasi utama">
            <Show
              when={currentUser()?.role === 'member'}
              fallback={
                <>
                  <Link to="/dashboard" activeProps={{ class: 'active' }}>
                    Dashboard
                  </Link>
                  <Link to="/admin/users" activeProps={{ class: 'active' }}>
                    Management User
                  </Link>
                </>
              }
            >
              <Link to="/home" activeProps={{ class: 'active' }}>
                Home
              </Link>
              <span
                class="nav-disabled"
                aria-disabled="true"
                title="Pinjaman belum tersedia"
              >
                Pinjaman
              </span>
            </Show>
          </nav>
          <div class="header-account">
            <Show when={currentUser()?.role === 'member'}>
              <NotificationsMenu />
            </Show>
            {/* AC-02.01: email selalu tampil di kanan atas, termasuk pada layar kecil. */}
            <div class="account-label">
              <span>{currentUser()?.full_name}</span>
              <span>{currentUser()?.email}</span>
            </div>
            <button
              type="button"
              class="logout-button"
              aria-label="Logout"
              title="Logout"
              disabled={busy()}
              onClick={signOut}
            >
              <Icon name="logout" size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>
      <Outlet />
      <Show when={currentUser()?.role === 'member'}>
        <ReminderHost />
      </Show>
      <footer class="app-footer">
        <span class="footer-brand">ReadOnly</span>
        <span>Perpustakaan internal PT. Perkasa Pilar Utama</span>
      </footer>
    </>
  );
}
