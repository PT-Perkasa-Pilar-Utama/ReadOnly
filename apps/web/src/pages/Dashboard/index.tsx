import { Link } from '@tanstack/solid-router';
import Icon from '@web/components/Icon';

// AC-02.05: tujuan redirect Admin. Isi dashboard US-04 adalah bagian FE lain.
export default function DashboardPage() {
  return (
    <main class="page-container">
      <header class="section-heading">
        <div>
          <span class="eyebrow">ADMIN PERPUS</span>
          <h1>Dashboard</h1>
        </div>
      </header>
      <section class="dashboard-integration">
        <span class="summary-icon">
          <Icon name="book" size={34} />
        </span>
        <h2>Selamat datang di ReadOnly</h2>
        <p>Ringkasan perpustakaan belum tersedia.</p>
        <Link to="/admin/users" class="button">
          <Icon name="users" size={18} />
          Management User
          <Icon name="arrow" size={17} />
        </Link>
      </section>
    </main>
  );
}
