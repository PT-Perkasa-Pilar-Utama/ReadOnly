import { describe, expect, test } from 'bun:test';
import {
  hasErrors,
  validateAccount,
  validateEdit,
  validateLogin,
} from './validation';

const account = {
  full_name: 'Pembaca Uji',
  email: 'uji@example.test',
  phone_number: '0800000000',
  address: 'Alamat uji',
  password: 'password',
  confirm_password: 'password',
};
describe('validasi FE sesuai AC', () => {
  test('AC-02.04: dua pesan mandatory login yang berbeda', () => {
    expect(validateLogin({ email: ' ', password: '' })).toEqual({
      email: 'email tidak boleh kosong',
      password: 'Password tidak boleh kosong',
    });
  });
  test('AC-01.03: semua field kosong mendapat pesan inline', () => {
    const errors = validateAccount({
      full_name: '',
      email: '',
      phone_number: '',
      address: '',
      password: '',
      confirm_password: '',
    });
    expect(Object.keys(errors)).toHaveLength(6);
    expect(
      Object.values(errors).every(
        (message) => message === 'Field harus diisi!',
      ),
    ).toBe(true);
  });
  test('AC-01.04–05, AC-12.04: email invalid dan konfirmasi berbeda', () => {
    expect(
      validateAccount({
        ...account,
        email: 'newmember.com',
        confirm_password: 'other',
      }),
    ).toEqual({
      email: 'Format email salah',
      confirm_password: 'Password harus sama',
    });
  });
  test('AC-01.02: data valid tidak menghasilkan error', () => {
    expect(hasErrors(validateAccount(account))).toBe(false);
  });
  test('password terisi di bawah 8 karakter mendapat pesan panjang minimum', () => {
    for (const password of ['123', 'abcdefg', '!@#$%^&']) {
      expect(
        validateAccount({ ...account, password, confirm_password: password }),
      ).toEqual({ password: 'Password minimal 8 karakter.' });
    }
  });
  test('password tepat 8 karakter tidak memerlukan kombinasi jenis karakter', () => {
    for (const password of ['12345678', 'abcdefgh', '!@#$%^&*']) {
      expect(
        validateAccount({ ...account, password, confirm_password: password }),
      ).toEqual({});
    }
  });
  test('password hanya spasi tetap mendapat pesan field wajib', () => {
    expect(
      validateAccount({ ...account, password: '   ', confirm_password: '   ' }),
    ).toEqual({
      password: 'Field harus diisi!',
      confirm_password: 'Field harus diisi!',
    });
  });
  test('AC-12.03: alamat Member tidak boleh hanya spasi', () => {
    expect(
      validateEdit({ full_name: 'Uji', phone_number: '08', address: ' ' }),
    ).toEqual({ address: 'Field harus diisi!' });
  });
  test('AC-12.05: edit Admin tidak memerlukan alamat', () => {
    expect(
      hasErrors(validateEdit({ full_name: 'Uji Admin', phone_number: '08' })),
    ).toBe(false);
  });
});
