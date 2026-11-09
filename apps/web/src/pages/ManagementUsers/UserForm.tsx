import { USER_ROLE_LABELS } from '@readonly/shared';
import { Link, useNavigate } from '@tanstack/solid-router';
import { ApiError } from '@web/api/client';
import type { Registration, UserDetail } from '@web/api/contracts';
import { addAdmin, editUser } from '@web/api/users';
import { ErrorNotice, notify } from '@web/components/Feedback';
import Field from '@web/components/Field';
import Icon from '@web/components/Icon';
import { queryClient } from '@web/lib/query';
import { currentUser, setCurrentUser } from '@web/lib/session';
import {
  type FieldErrors,
  hasErrors,
  validateAccount,
  validateEdit,
} from '@web/lib/validation';
import { createSignal, Show } from 'solid-js';

export default function UserForm(props: { user?: UserDetail }) {
  const navigate = useNavigate();
  const [input, setInput] = createSignal<Registration>({
    full_name: props.user?.full_name ?? '',
    email: props.user?.email ?? '',
    phone_number: props.user?.phone_number ?? '',
    address: props.user?.address ?? '',
    password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = createSignal<FieldErrors>({});
  const [failure, setFailure] = createSignal<unknown>();
  const [busy, setBusy] = createSignal(false);
  const update = (field: keyof Registration, value: string) =>
    setInput((previous) => ({ ...previous, [field]: value }));
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    setFailure(undefined);
    const { address, ...account } = input();
    const edit = {
      full_name: input().full_name,
      phone_number: input().phone_number,
      ...(props.user?.role === 'member' ? { address } : {}),
    };
    const fields = props.user ? validateEdit(edit) : validateAccount(account);
    setErrors(fields);
    if (hasErrors(fields)) return;
    setBusy(true);
    try {
      const result = props.user
        ? await editUser(props.user.id, edit)
        : await addAdmin(account);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      if (props.user)
        await queryClient.invalidateQueries({
          queryKey: ['user', props.user.id],
        });
      const current = currentUser();
      if (current && current.id === props.user?.id)
        setCurrentUser({ ...current, full_name: edit.full_name });
      notify(
        result.message ??
          (props.user
            ? 'Data user berhasil diubah'
            : 'Admin berhasil ditambahkan'),
      );
      setInput((previous) => ({
        ...previous,
        password: '',
        confirm_password: '',
      }));
      await navigate({ to: '/admin/users' });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'conflict' && !props.user)
        setErrors({ email: 'Email sudah terdaftar' });
      else if (error instanceof ApiError && error.field)
        setErrors({ [error.field]: error.message });
      else setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link to="/admin/users" class="back-link">
        <Icon name="back" size={17} />
        Management User
      </Link>
      <header class="section-heading">
        <div>
          <h1>{props.user ? 'Edit User' : 'Add Admin'}</h1>
          <p>
            {props.user
              ? 'Perbarui informasi akun pengguna.'
              : 'Tambahkan akun Admin Perpus baru.'}
          </p>
        </div>
      </header>
      <div class="user-form-card">
        <div class="user-form-summary">
          <span class="summary-icon">
            <Icon name="users" size={30} />
          </span>
          <h2>{props.user ? props.user.full_name : 'Admin Perpus'}</h2>
          <p>
            {props.user
              ? USER_ROLE_LABELS[props.user.role]
              : 'Akun baru akan berstatus Aktif.'}
          </p>
        </div>
        <form onSubmit={submit} noValidate aria-busy={busy()}>
          <Show when={failure()}>
            <ErrorNotice error={failure()} />
          </Show>
          {/* AC-12.02–AC-12.05: email/role terkunci pada Edit; alamat hanya untuk Member. */}
          <Field
            name="full_name"
            label="Nama Lengkap"
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
            readonly={Boolean(props.user)}
            placeholder="Masukkan e-mail"
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
          <Show
            when={props.user}
            fallback={
              <div class="form-grid">
                <Field
                  name="password"
                  label="Password"
                  value={input().password}
                  onInput={(value) => update('password', value)}
                  error={errors().password}
                  type="password"
                  autocomplete="new-password"
                />
                <Field
                  name="confirm_password"
                  label="Konfirmasi Password"
                  value={input().confirm_password}
                  onInput={(value) => update('confirm_password', value)}
                  error={errors().confirm_password}
                  type="password"
                  autocomplete="new-password"
                />
              </div>
            }
          >
            <Field
              name="role"
              label="Role"
              value={props.user ? USER_ROLE_LABELS[props.user.role] : ''}
              onInput={() => {}}
              readonly
            />
            <Show when={props.user?.role === 'member'}>
              <Field
                name="address"
                label="Alamat"
                value={input().address}
                onInput={(value) => update('address', value)}
                error={errors().address}
                autocomplete="street-address"
              />
            </Show>
          </Show>
          <div class="form-actions">
            <Link to="/admin/users" class="button secondary">
              Batal
            </Link>
            <button class="button" type="submit" disabled={busy()}>
              {busy() ? 'Menyimpan…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
