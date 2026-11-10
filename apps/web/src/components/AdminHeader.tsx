import { useNavigate } from '@tanstack/solid-router';
import { createSignal, For, Show } from 'solid-js';
import { currentUser, endSession } from '../lib/session';
import { notify } from './Feedback';
import Icon from './Icon';
import './AdminHeader.css';

type AdminSection =
  | 'dashboard'
  | 'books'
  | 'loans'
  | 'genres'
  | 'users';

const ADMIN_NAVIGATION = [
  {
    label: 'Dashboard',
    section: 'dashboard',
    href: '/',
    available: true,
  },
  {
    label: 'Master Buku',
    section: 'books',
    href: '/admin/books',
    available: true,
  },
  {
    label: 'Peminjaman',
    section: 'loans',
    href: '/admin/loans',
    available: true,
  },
  {
    label: 'Master Genre',
    section: 'genres',
    href: '/admin/genres',
    available: true,
  },
  {
    label: 'Management User',
    section: 'users',
    href: '/admin/users',
    available: true,
  },
] as const;

interface AdminHeaderProps {
  activeSection: AdminSection;
}

export function AdminHeader(props: AdminHeaderProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = createSignal(false);
  async function signOut() {
    if (busy()) return;
    setBusy(true);
    try {
      // AC-03.01: sesi server diakhiri sebelum kembali ke halaman login.
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
    <header class="admin-header">
      <div class="admin-header__inner">
        <a
          class="admin-header__brand"
          href="/"
          aria-label="ReadOnly, Dashboard"
        >
          ReadOnly
        </a>

        <nav
          class="admin-header__navigation"
          aria-label="Navigasi Admin Perpus"
        >
          <For each={ADMIN_NAVIGATION}>
            {(item) =>
              item.available ? (
                <a
                  class="admin-header__link"
                  classList={{
                    'is-active': props.activeSection === item.section,
                  }}
                  href={item.href}
                  aria-current={
                    props.activeSection === item.section ? 'page' : undefined
                  }
                >
                  {item.label}
                </a>
              ) : (
                <span
                  class="admin-header__link admin-header__link--pending"
                  aria-disabled="true"
                  title={`${item.label} belum tersedia pada tahap pengerjaan ini`}
                >
                  {item.label}
                </span>
              )
            }
          </For>
        </nav>

        <div class="admin-header__account">
          <div class="admin-header__identity">
            <span class="admin-header__role">
              {currentUser()?.full_name ?? 'Admin Perpus'}
            </span>
            <Show when={currentUser()?.email}>
              <span class="admin-header__email">{currentUser()?.email}</span>
            </Show>
          </div>
          <button
            type="button"
            class="admin-header__logout"
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
  );
}
