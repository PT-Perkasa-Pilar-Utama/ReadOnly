import { z } from 'zod';
import { ApiError } from '../api/client';
import { registrationSchema, userDetailSchema } from '../api/contracts';
import { hasErrors, validateAccount, validateEdit } from '../lib/validation';
import {
  DEMO_ADMIN,
  DEMO_MEMBER,
  DEMO_PASSWORD,
  demoBooks,
  demoGenres,
  makeDemoPopups,
} from './fixtures';

const storedUserSchema = userDetailSchema.extend({
  password_digest: z.string(),
  genres: z.array(z.string()),
  has_active_loans: z.boolean(),
});
const storeSchema = z.object({
  users: z.array(storedUserSchema),
  session_id: z.string().nullable(),
});
type DemoState = z.infer<typeof storeSchema>;
type DemoUser = DemoState['users'][number];
export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const key = 'readonly:demo:v1';
async function digest(password: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)),
    ),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
}
function fail(
  status: number,
  code: string,
  message: string,
  field?: string,
): never {
  throw new ApiError(status, code, message, field);
}
function profile(user: DemoUser) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  };
}
function publicUser(user: DemoUser) {
  return {
    ...profile(user),
    phone_number: user.phone_number,
    status: user.status,
  };
}
function validateInput<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) fail(422, 'invalid_request', 'Permintaan tidak valid.');
  return parsed.data;
}
function validateFields(errors: Record<string, string | undefined>) {
  if (hasErrors(errors)) {
    const [field, message] =
      Object.entries(errors).find(([, value]) => value) ?? [];
    fail(422, 'invalid_request', message ?? 'Field harus diisi!', field);
  }
}
function paginate<T>(items: T[], query: URLSearchParams) {
  const page = Math.max(1, Number(query.get('page') ?? 1));
  const limit = Math.min(50, Math.max(1, Number(query.get('limit') ?? 10)));
  return {
    data: items.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

// AC-01/02/07/10/12: simulator mengikuti kontrak API dan tidak mengubah backend proyek.
export function createDemoApi(
  storage: DemoStorage,
  clock: () => Date = () => new Date(),
) {
  let loaded: Promise<DemoState> | undefined;
  const persist = (state: DemoState) =>
    storage.setItem(key, JSON.stringify(state));
  async function load(): Promise<DemoState> {
    const saved = storage.getItem(key);
    if (saved) return storeSchema.parse(JSON.parse(saved));
    const password_digest = await digest(DEMO_PASSWORD);
    const users: DemoUser[] = [
      {
        id: 'admin-1',
        full_name: 'Admin Demo',
        email: DEMO_ADMIN,
        phone_number: '08000000001',
        role: 'admin',
        status: 'active',
        address: null,
        password_digest,
        genres: [],
        has_active_loans: false,
      },
      {
        id: 'member-1',
        full_name: 'Alya Demo',
        email: DEMO_MEMBER,
        phone_number: '08000000002',
        role: 'member',
        status: 'active',
        address: 'Alamat simulasi',
        password_digest,
        genres: ['genre-1'],
        has_active_loans: true,
      },
      {
        id: 'member-inactive',
        full_name: 'Member Nonaktif Demo',
        email: 'nonaktif@demo.readonly.test',
        phone_number: '08000000003',
        role: 'member',
        status: 'inactive',
        address: 'Alamat simulasi',
        password_digest,
        genres: [],
        has_active_loans: false,
      },
      ...Array.from(
        { length: 10 },
        (_, index): DemoUser => ({
          id: `member-extra-${index + 1}`,
          full_name: `Pembaca Demo ${index + 1}`,
          email: `pembaca${index + 1}@demo.readonly.test`,
          phone_number: `080000000${String(index + 4).padStart(2, '0')}`,
          role: 'member',
          status: 'active',
          address: 'Alamat simulasi',
          password_digest,
          genres: ['genre-3'],
          has_active_loans: false,
        }),
      ),
    ];
    const state = { users, session_id: null };
    persist(state);
    return state;
  }
  return async (path: string, options: RequestInit = {}): Promise<unknown> => {
    loaded ??= load();
    const state = await loaded;
    const url = new URL(path, 'https://demo.readonly.test');
    const route = url.pathname;
    const method = options.method ?? 'GET';
    const input: unknown =
      typeof options.body === 'string' ? JSON.parse(options.body) : {};
    const current = state.users.find((user) => user.id === state.session_id);

    if (route === '/genres' && method === 'GET') return { data: demoGenres };
    if (route === '/auth/register/validate' || route === '/auth/register') {
      const data = validateInput(registrationSchema, input);
      validateFields(validateAccount(data));
      if (
        state.users.some(
          (user) =>
            user.email.toLowerCase() === data.email.trim().toLowerCase(),
        )
      )
        fail(409, 'conflict', 'Email sudah terdaftar', 'email');
      if (route.endsWith('/validate'))
        return { data: { step: 2 }, message: 'Data valid' };
      const { genres } = validateInput(
        z.object({ genres: z.array(z.string()) }),
        input,
      );
      if (
        !genres.length ||
        genres.some((id) => !demoGenres.some((genre) => genre.id === id))
      )
        fail(422, 'invalid_request', 'Pilih minimal 1 genre', 'genres');
      const user: DemoUser = {
        id: crypto.randomUUID(),
        full_name: data.full_name,
        email: data.email.trim(),
        phone_number: data.phone_number,
        address: data.address,
        password_digest: await digest(data.password),
        role: 'member',
        status: 'active',
        genres: [...new Set(genres)],
        has_active_loans: false,
      };
      state.users.push(user);
      persist(state);
      return {
        data: { userId: user.id, role: user.role },
        message: 'Akun berhasil dibuat',
      };
    }
    if (route === '/auth/login' && method === 'POST') {
      const data = validateInput(
        z.object({ email: z.string(), password: z.string() }),
        input,
      );
      const user = state.users.find(
        (user) => user.email.toLowerCase() === data.email.trim().toLowerCase(),
      );
      if (!user) fail(422, 'user_not_found', 'Email Not Registered');
      if (user.password_digest !== (await digest(data.password)))
        fail(422, 'invalid_credentials', 'email and Password tidak sama');
      if (user.status === 'inactive')
        fail(
          403,
          'account_inactive',
          'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.',
        );
      state.session_id = user.id;
      persist(state);
      return { data: {}, message: 'Login Berhasil' };
    }
    if (!current) fail(401, 'session_not_found', 'Silahkan login');
    if (route === '/auth/me') return { data: profile(current) };
    if (route === '/auth/logout' && method === 'POST') {
      state.session_id = null;
      persist(state);
      return undefined;
    }
    if (current.status === 'inactive')
      fail(401, 'session_not_found', 'Silahkan login');
    if (route.startsWith('/admin/')) {
      if (current.role !== 'admin') fail(403, 'forbidden', 'Akses ditolak.');
      const parts = route.split('/');
      if (route === '/admin/users' && method === 'GET') {
        const q = (url.searchParams.get('q') ?? '').toLowerCase();
        const role = url.searchParams.get('role');
        return paginate(
          state.users
            .filter(
              (user) =>
                (!role || user.role === role) &&
                `${user.full_name} ${user.email}`.toLowerCase().includes(q),
            )
            .map(publicUser),
          url.searchParams,
        );
      }
      if (route === '/admin/users' && method === 'POST') {
        const data = validateInput(
          registrationSchema.omit({ address: true }),
          input,
        );
        validateFields(validateAccount(data));
        if (
          state.users.some(
            (user) =>
              user.email.toLowerCase() === data.email.trim().toLowerCase(),
          )
        )
          fail(409, 'conflict', 'Email sudah terdaftar', 'email');
        const user: DemoUser = {
          ...data,
          id: crypto.randomUUID(),
          email: data.email.trim(),
          password_digest: await digest(data.password),
          address: null,
          role: 'admin',
          status: 'active',
          genres: [],
          has_active_loans: false,
        };
        // Simulasi menyimpan digest saja; password dari form tidak dipersistenkan.
        const safeUser = storedUserSchema.parse(user);
        state.users.push(safeUser);
        persist(state);
        return {
          data: publicUser(safeUser),
          message: 'Admin berhasil ditambahkan',
        };
      }
      const user = state.users.find((user) => user.id === parts[3]);
      if (!user) fail(404, 'not_found', 'User tidak ditemukan');
      if (parts[4] === 'status' && method === 'PATCH') {
        const { status } = validateInput(
          z.object({ status: z.enum(['active', 'inactive']) }),
          input,
        );
        if (status === 'inactive' && user.id === current.id)
          fail(
            403,
            'cannot_deactivate_self',
            'Admin tidak dapat menonaktifkan akunnya sendiri',
          );
        if (status === 'inactive' && user.has_active_loans)
          fail(
            409,
            'account_has_active_loans',
            'Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif',
          );
        user.status = status;
        persist(state);
        return {
          data: { id: user.id, status },
          message:
            status === 'active'
              ? 'Akun berhasil diaktifkan'
              : 'Akun berhasil dinonaktifkan',
        };
      }
      if (method === 'PATCH') {
        const schema = z.object({
          full_name: z.string(),
          phone_number: z.string(),
        });
        const data =
          user.role === 'member'
            ? validateInput(
                schema.extend({ address: z.string() }).strict(),
                input,
              )
            : validateInput(schema.strict(), input);
        validateFields(validateEdit(data));
        Object.assign(user, data);
        persist(state);
        return {
          data: {
            id: user.id,
            full_name: user.full_name,
            phone_number: user.phone_number,
            address: user.address,
            role: user.role,
          },
          message: 'Data user berhasil diubah',
        };
      }
      return { data: { ...publicUser(user), address: user.address } };
    }
    if (route === '/books') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const author = url.searchParams.get('author');
      const genre = url.searchParams.get('genre');
      const books = demoBooks.filter(
        (book) =>
          (!author || book.author === author) &&
          (!genre || book.genres.some((g) => g.id === genre)) &&
          `${book.title} ${book.author} ${book.genres.map((g) => g.name).join(' ')}`
            .toLowerCase()
            .includes(q),
      );
      return {
        ...paginate(books, url.searchParams),
        recommendations: demoBooks
          .filter(
            (book) =>
              book.genres.some((g) => current.genres.includes(g.id)) ||
              (book.average_rating ?? 0) > 3,
          )
          .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
          .slice(0, 6),
        authors: [...new Set(demoBooks.map((book) => book.author))].sort(),
      };
    }
    if (route.startsWith('/books/')) {
      const book = demoBooks.find((book) => book.id === route.split('/')[2]);
      if (!book) fail(404, 'not_found', 'Buku tidak ditemukan');
      return { data: book };
    }
    if (route === '/notifications') {
      if (current.role !== 'member') fail(403, 'forbidden', 'Akses ditolak.');
      const popups = current.has_active_loans ? makeDemoPopups(clock()) : [];
      const notifications = popups.flatMap((popup) =>
        popup.books.map((book) => {
          const date = new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta',
          }).format(new Date(`${book.due_date}T12:00:00+07:00`));
          return {
            id: `notif-${book.loan_id}`,
            loan_id: book.loan_id,
            type:
              popup.condition === 'DUE_SOON' ? 'DUE_SOON_3D' : popup.condition,
            title:
              popup.condition === 'DUE_SOON'
                ? 'Batas pengembalian 3 hari lagi'
                : popup.condition === 'OVERDUE'
                  ? 'Buku melewati batas pengembalian'
                  : `${book.book_title} sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan`,
            text:
              popup.condition === 'DUE_SOON'
                ? `${book.book_title} perlu dikembalikan paling lambat ${date}.`
                : popup.condition === 'OVERDUE'
                  ? `${book.book_title} jatuh tempo pada ${date}. Segera ajukan pengembalian.`
                  : '',
            book_title: book.book_title,
            due_date: book.due_date,
            created_at: clock().toISOString(),
          };
        }),
      );
      return {
        ...paginate(notifications, url.searchParams),
        login_popups: popups,
      };
    }
    return fail(404, 'not_found', 'Resource tidak ditemukan.');
  };
}

let instance: ReturnType<typeof createDemoApi> | undefined;
export const demoRequest = (path: string, options: RequestInit) => {
  instance ??= createDemoApi(sessionStorage);
  return instance(path, options);
};
