import { afterEach, describe, expect, test } from 'bun:test';
import {
  confirmAdminFeedback,
  dismissAdminFeedback,
  getAdminFeedback,
  requestAdminConfirmation,
  showAdminFeedback,
} from './admin-feedback-store';

afterEach(() => {
  dismissAdminFeedback();
});

describe('Admin feedback store', () => {
  test('keeps success messages available across route changes', () => {
    showAdminFeedback('Buku berhasil ditambahkan', 'success');

    expect(getAdminFeedback()()?.message).toBe('Buku berhasil ditambahkan');
    expect(getAdminFeedback()()?.title).toBe('Berhasil');
    expect(getAdminFeedback()()?.type).toBe('success');
  });

  test('keeps exact error messages available to the modal', () => {
    showAdminFeedback('Buku tidak dapat dihapus karena masih dipinjam', 'error');

    expect(getAdminFeedback()()?.message).toBe(
      'Buku tidak dapat dihapus karena masih dipinjam',
    );
    expect(getAdminFeedback()()?.type).toBe('error');
  });

  test('resolves a confirmation when the primary action is selected', async () => {
    const confirmation = requestAdminConfirmation(
      'Apakah Anda yakin menghapus buku Buku QA ini?',
    );

    expect(getAdminFeedback()()?.type).toBe('confirm');
    expect(getAdminFeedback()()?.message).toBe(
      'Apakah Anda yakin menghapus buku Buku QA ini?',
    );

    confirmAdminFeedback();

    await expect(confirmation).resolves.toBe(true);
    expect(getAdminFeedback()()).toBeNull();
  });

  test('resolves a confirmation as false when cancelled', async () => {
    const confirmation = requestAdminConfirmation(
      'Apakah Anda yakin menghapus buku Buku QA ini?',
    );

    dismissAdminFeedback();

    await expect(confirmation).resolves.toBe(false);
  });

  test('can be dismissed', () => {
    showAdminFeedback('Buku berhasil diubah', 'success');
    dismissAdminFeedback();

    expect(getAdminFeedback()()).toBeNull();
  });

  test('ignores empty messages', () => {
    showAdminFeedback('   ', 'error');

    expect(getAdminFeedback()()).toBeNull();
  });
});
