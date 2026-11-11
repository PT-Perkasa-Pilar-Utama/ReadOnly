import type { JSX } from 'solid-js';
import DemoBanner from './DemoBanner';

export default function AuthLayout(props: { children: JSX.Element }) {
  return (
    <>
      <DemoBanner />
      <main class="auth-layout">
        <aside class="auth-art" aria-label="ReadOnly">
          <img src="/images/auth-background.jpg" alt="" />
          <a href="/login" class="wordmark" aria-label="ReadOnly">
            ReadOnly
          </a>
          {/* AC-01.01, AC-02.01: live text keeps the SVG fonts at their actual sizes. */}
          <div class="auth-art-copy">
            <h2>Ruang baca untuk setiap cerita.</h2>
            <p>
              Temukan bacaan pilihan dan kelola peminjaman buku dalam satu
              tempat
            </p>
          </div>
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
