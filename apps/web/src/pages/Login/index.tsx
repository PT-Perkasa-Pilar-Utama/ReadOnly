import { useNavigate } from '@tanstack/solid-router';
import { getProfile, login } from '@web/api/auth';
import { isDemo } from '@web/api/client';
import AuthLayout from '@web/components/AuthLayout';
import { ErrorNotice, notify } from '@web/components/Feedback';
import Field from '@web/components/Field';
import { beginLogin } from '@web/lib/session';
import {
  type FieldErrors,
  hasErrors,
  validateLogin,
} from '@web/lib/validation';
import { createSignal, lazy, Show } from 'solid-js';

const DemoAccounts = import.meta.env.DEV
  ? lazy(() => import('@web/dev/DemoAccounts'))
  : () => null;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [errors, setErrors] = createSignal<FieldErrors>({});
  const [failure, setFailure] = createSignal<unknown>();
  const [busy, setBusy] = createSignal(false);
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    const input = { email: email().trim(), password: password() };
    const fields = validateLogin(input);
    setErrors(fields);
    setFailure(undefined);
    if (hasErrors(fields)) return;
    setBusy(true);
    try {
      await login(input);
      const user = await getProfile();
      beginLogin(user);
      setPassword('');
      notify('Login Berhasil');
      // AC-02.01, AC-02.05: tujuan login mengikuti role dari /auth/me.
      await navigate({ to: user.role === 'admin' ? '/dashboard' : '/home' });
    } catch (error) {
      // AC-02.02, AC-02.03, AC-12.07: gagal login tetap di form dengan pesan API.
      setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <header class="form-heading">
        <h1>Login</h1>
        <p>Silahkan masukkan informasi disini.</p>
      </header>
      <Show when={failure()}>
        <ErrorNotice error={failure()} />
      </Show>
      <form onSubmit={submit} noValidate aria-busy={busy()}>
        {/* AC-02.04: kedua pesan mandatory ditampilkan di bawah field masing-masing. */}
        <Field
          name="email"
          label="Email"
          value={email()}
          onInput={setEmail}
          error={errors().email}
          type="email"
          autocomplete="username"
          placeholder="Masukkan e-mail"
        />
        <Field
          name="password"
          label="Password"
          value={password()}
          onInput={setPassword}
          error={errors().password}
          type="password"
          autocomplete="current-password"
          placeholder="Masukkan password"
        />
        <button class="button full" type="submit" disabled={busy()}>
          {busy() ? 'Memproses…' : 'Login'}
        </button>
        <p class="auth-switch">
          Belum punya akun? <a href="/register">Sign Up</a>
        </p>
      </form>
      <Show when={isDemo}>
        <DemoAccounts
          onSelect={(email, password) => {
            setEmail(email);
            setPassword(password);
            setErrors({});
            setFailure(undefined);
          }}
        />
      </Show>
    </AuthLayout>
  );
}
