import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
} from '@tanstack/solid-router';
import { AdminFeedback } from './components/AdminFeedback';
import AppLayout from './components/AppLayout';
import { ErrorNotice, Loading, ToastRegion } from './components/Feedback';
import { loadSession } from './lib/session';
import BookDetailPage from './pages/BookDetail';
import { DashboardPage as AdminDashboardPage } from './pages/Dashboard/DashboardPage';
import HomePage from './pages/Home';
import { LoanDetailPage } from './pages/LoanManagement/LoanDetailPage';
import { LoanManagementPage } from './pages/LoanManagement/LoanManagementPage';
import LoginPage from './pages/Login';
import UsersPage from './pages/ManagementUsers';
import AddAdminPage from './pages/ManagementUsers/AddAdmin';
import EditUserPage from './pages/ManagementUsers/EditUser';
import { BookFormPage } from './pages/MasterBooks/BookFormPage';
import { MasterBooksPage } from './pages/MasterBooks/MasterBooksPage';
import GenresPage from './pages/PilihGenre';
import RegisterPage from './pages/RegisterStep1';
import {
  clearRegistration,
  registrationDraft,
} from './pages/RegisterStep1/draft';

const root = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <ToastRegion />
      <AdminFeedback />
    </>
  ),
  notFoundComponent: () => (
    <main class="page-container empty-state">
      <h1>Halaman tidak ditemukan</h1>
      <Link to="/" class="button">
        Kembali
      </Link>
    </main>
  ),
});
const index = createRoute({
  getParentRoute: () => root,
  path: '/',
  beforeLoad: async () => {
    const user = await loadSession();
    throw redirect({
      to: user ? (user.role === 'admin' ? '/dashboard' : '/home') : '/login',
      replace: true,
    });
  },
});
async function guestOnly() {
  const user = await loadSession();
  if (user)
    throw redirect({
      to: user.role === 'admin' ? '/dashboard' : '/home',
      replace: true,
    });
}
const login = createRoute({
  getParentRoute: () => root,
  path: '/login',
  beforeLoad: async () => {
    clearRegistration();
    await guestOnly();
  },
  component: LoginPage,
});
const register = createRoute({
  getParentRoute: () => root,
  path: '/register',
  beforeLoad: guestOnly,
  component: RegisterPage,
});
const genres = createRoute({
  getParentRoute: () => root,
  path: '/register/genres',
  beforeLoad: async () => {
    await guestOnly();
    if (!registrationDraft())
      throw redirect({ to: '/register', replace: true });
  },
  component: GenresPage,
});
// AC-02.05: guard UI membaca sesi server; backend tetap wajib memeriksa RBAC sendiri.
const authenticated = createRoute({
  getParentRoute: () => root,
  id: 'authenticated',
  beforeLoad: async () => {
    const user = await loadSession();
    if (!user) throw redirect({ to: '/login', replace: true });
    return { user };
  },
  component: AppLayout,
});
const home = createRoute({
  getParentRoute: () => authenticated,
  path: '/home',
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'member') throw redirect({ to: '/dashboard' });
  },
  component: HomePage,
});
const book = createRoute({
  getParentRoute: () => authenticated,
  path: '/books/$bookId',
  component: BookDetailPage,
});
const admin = createRoute({
  getParentRoute: () => authenticated,
  id: 'admin',
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin')
      throw redirect({ to: '/forbidden', replace: true });
  },
  component: Outlet,
});
// Halaman Admin US-04/05/06 memakai AdminHeader sendiri, sehingga tidak
// ditempatkan di dalam AppLayout agar header tidak tampil dua kali.
const adminArea = createRoute({
  getParentRoute: () => root,
  id: 'adminArea',
  beforeLoad: async () => {
    const user = await loadSession();
    if (!user) throw redirect({ to: '/login', replace: true });
    if (user.role !== 'admin') {
      throw redirect({ to: '/forbidden', replace: true });
    }
    return { user };
  },
  component: Outlet,
});

const adminDashboard = createRoute({
  getParentRoute: () => adminArea,
  path: '/dashboard',
  component: AdminDashboardPage,
});
const adminBooks = createRoute({
  getParentRoute: () => adminArea,
  path: '/admin/books',
  component: MasterBooksPage,
});
const addBook = createRoute({
  getParentRoute: () => adminArea,
  path: '/admin/books/new',
  component: () => <BookFormPage mode="create" />,
});
const editBook = createRoute({
  getParentRoute: () => adminArea,
  path: '/admin/books/$bookId/edit',
  component: EditBookRouteComponent,
});
const adminLoans = createRoute({
  getParentRoute: () => adminArea,
  path: '/admin/loans',
  component: LoanManagementPage,
});
const adminLoanDetail = createRoute({
  getParentRoute: () => adminArea,
  path: '/admin/loans/$loanId',
  component: AdminLoanDetailRouteComponent,
});

function EditBookRouteComponent() {
  const params = editBook.useParams();
  return <BookFormPage mode="edit" bookId={params().bookId} />;
}

function AdminLoanDetailRouteComponent() {
  const params = adminLoanDetail.useParams();
  return <LoanDetailPage loanId={params().loanId} />;
}

const users = createRoute({
  getParentRoute: () => admin,
  path: '/admin/users',
  component: UsersPage,
});
const addUser = createRoute({
  getParentRoute: () => users,
  path: '/add',
  component: AddAdminPage,
});
const editUser = createRoute({
  getParentRoute: () => users,
  path: '/$userId/edit',
  component: EditUserPage,
});
const forbidden = createRoute({
  getParentRoute: () => authenticated,
  path: '/forbidden',
  component: () => (
    <main class="page-container empty-state">
      <h1>Akses ditolak.</h1>
      <p>Halaman ini hanya dapat diakses Admin Perpus.</p>
      <Link to="/home" class="button">
        Kembali ke Home
      </Link>
    </main>
  ),
});
export const router = createRouter({
  routeTree: root.addChildren([
    index,
    login,
    register,
    genres,
    authenticated.addChildren([
      home,
      book,
      forbidden,
      admin.addChildren([users.addChildren([addUser, editUser])]),
    ]),
    adminArea.addChildren([
      adminDashboard,
      adminBooks,
      addBook,
      editBook,
      adminLoans,
      adminLoanDetail,
    ]),
  ]),
  defaultPendingComponent: Loading,
  defaultErrorComponent: (props) => (
    <main class="page-container">
      <ErrorNotice error={props.error} retry={props.reset} />
      <a class="back-link" href="/login">
        Kembali ke Login
      </a>
    </main>
  ),
  defaultPreload: false,
  defaultPendingMinMs: 150,
});
declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router;
  }
}
