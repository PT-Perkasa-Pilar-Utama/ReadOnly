import type { JSX } from 'solid-js';
import DemoBanner from './DemoBanner';

export default function AuthLayout(props: { children: JSX.Element }) {
  return (
    <>
      <DemoBanner />
      <main class="auth-layout">
        <aside class="auth-art">
          <img
            src="/images/auth-panel.webp"
            alt="ReadOnly. Ruang baca untuk setiap cerita. Temukan bacaan pilihan dan kelola peminjaman buku dalam satu tempat."
          />
        </aside>
        <section class="auth-main">
          <a
            href="/login"
            class="wordmark mobile-wordmark"
            aria-label="ReadOnly"
          >
            ReadOnly
          </a>
          <div class="auth-form">{props.children}</div>
          <footer class="auth-footer">
            Perpustakaan internal PT. Perkasa Pilar Utama
          </footer>
        </section>
      </main>
    </>
  );
}
