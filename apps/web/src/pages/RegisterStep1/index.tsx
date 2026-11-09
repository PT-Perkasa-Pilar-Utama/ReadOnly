import { useNavigate } from '@tanstack/solid-router';
import { validateRegistration } from '@web/api/auth';
import { ApiError } from '@web/api/client';
import type { Registration } from '@web/api/contracts';
import AuthLayout from '@web/components/AuthLayout';
import Field from '@web/components/Field';
import { ErrorNotice } from '@web/components/Feedback';
import {
  type FieldErrors,
  hasErrors,
  validateAccount,
} from '@web/lib/validation';
import { createSignal, Show } from 'solid-js';
import {
  emptyRegistration,
  registrationDraft,
  setRegistrationDraft,
} from './draft';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [input, setInput] = createSignal<Registration>(
    registrationDraft() ?? emptyRegistration(),
  );
  const [errors, setErrors] = createSignal<FieldErrors>({});
  const [busy, setBusy] = createSignal(false);
  const [failure, setFailure] = createSignal<unknown>();
  const update = (field: keyof Registration, value: string) =>
    setInput((previous) => ({ ...previous, [field]: value }));
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    const fields = validateAccount(input());
    setErrors(fields);
    setFailure(undefined);
    if (hasErrors(fields)) return;
    setBusy(true);
    try {
      await validateRegistration(input());
      setRegistrationDraft({ ...input() });
      await navigate({ to: '/register/genres' });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'conflict')
        setErrors({ email: 'Email sudah terdaftar' });
      else if (error instanceof ApiError && error.field)
        setErrors({ [error.field]: error.message });
      else setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <header class="form-heading">
        <span class="eyebrow">LANGKAH 01 / 02</span>
        <h1>Register</h1>
        <p>Silahkan masukkan informasi disini.</p>
      </header>
      <Show when={failure()}>
        <ErrorNotice error={failure()} />
      </Show>
      <form onSubmit={submit} noValidate aria-busy={busy()}>
        {/* AC-01.01: enam field wajib; AC-01.03–AC-01.05: validasi pada langkah Next. */}
        <Field
          name="full_name"
          label="Nama lengkap"
          value={input().full_name}
          onInput={(value) => update('full_name', value)}
          error={errors().full_name}
          autocomplete="name"
          placeholder="Masukkan nama lengkap"
        />
        <Field
          name="email"
          label="Email"
          value={input().email}
          onInput={(value) => update('email', value)}
          error={errors().email}
          type="email"
          autocomplete="email"
          placeholder="Masukkan e-mail"
        />
        <Field
          name="address"
          label="Alamat"
          value={input().address}
          onInput={(value) => update('address', value)}
          error={errors().address}
          autocomplete="street-address"
          placeholder="Masukkan alamat"
        />
        <Field
          name="phone_number"
          label="Nomor Ponsel"
          value={input().phone_number}
          onInput={(value) => update('phone_number', value)}
          error={errors().phone_number}
          type="tel"
          autocomplete="tel"
          placeholder="Masukkan nomor ponsel"
        />
        <div class="form-grid">
          <Field
            name="password"
            label="Password"
            value={input().password}
            onInput={(value) => update('password', value)}
            error={errors().password}
            type="password"
            autocomplete="new-password"
            placeholder="Masukkan password"
          />
          <Field
            name="confirm_password"
            label="Konfirmasi Password"
            value={input().confirm_password}
            onInput={(value) => update('confirm_password', value)}
            error={errors().confirm_password}
            type="password"
            autocomplete="new-password"
            placeholder="Ulangi password"
          />
        </div>
        <button class="button full" type="submit" disabled={busy()}>
          {busy() ? 'Memproses…' : 'Next'}
        </button>
        <p class="auth-switch">
          Sudah punya akun? <a href="/login">Login</a>
        </p>
      </form>
    </AuthLayout>
  );
}
