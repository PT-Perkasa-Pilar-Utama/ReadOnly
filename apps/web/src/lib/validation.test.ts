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
