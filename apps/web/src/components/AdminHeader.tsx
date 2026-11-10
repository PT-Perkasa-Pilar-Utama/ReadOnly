import { For } from 'solid-js';
import './AdminHeader.css';

type AdminSection = 'dashboard' | 'books' | 'loans';

const ADMIN_NAVIGATION = [
  { label: 'Dashboard', section: 'dashboard', href: '/', available: true },
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
    available: false,
  },
] as const;

interface AdminHeaderProps {
  activeSection: AdminSection;
}

export function AdminHeader(props: AdminHeaderProps) {
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

        <span class="admin-header__role">Admin Perpus</span>
      </div>
    </header>
  );
}
