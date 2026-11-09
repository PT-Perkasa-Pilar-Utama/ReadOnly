import type { AdminInput, Registration, UserEdit } from '../api/contracts';

export type FieldErrors = Record<string, string | undefined>;
export function requiredFields(
  input: Record<string, string>,
  message = 'Field harus diisi!',
): FieldErrors {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => !value.trim())
      .map(([key]) => [key, message]),
  );
}
// AC-01.03–AC-01.05, AC-12.03–AC-12.04: teks validasi mengikuti BA secara verbatim.
export function validateAccount(input: Registration | AdminInput): FieldErrors {
  const errors = requiredFields(input);
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    errors.email = 'Format email salah';
  if (input.confirm_password && input.password !== input.confirm_password)
    errors.confirm_password = 'Password harus sama';
  return errors;
}
export function validateEdit(input: UserEdit): FieldErrors {
  return requiredFields(input);
}
export function validateLogin(input: {
  email: string;
  password: string;
}): FieldErrors {
  return {
    email: input.email.trim() ? undefined : 'email tidak boleh kosong',
    password: input.password ? undefined : 'Password tidak boleh kosong',
  };
}
export const hasErrors = (errors: FieldErrors) =>
  Object.values(errors).some(Boolean);
