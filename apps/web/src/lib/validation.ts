import { PASSWORD_MIN_LENGTH } from '@readonly/shared';
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
// AC-01.03–AC-01.05, AC-12.03–AC-12.04: copy mandatory/email/konfirmasi mengikuti BA.
export function validateAccount(input: Registration | AdminInput): FieldErrors {
  const errors = requiredFields(input);
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    errors.email = 'Format email salah';
  if (input.password.trim() && input.password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`;
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
