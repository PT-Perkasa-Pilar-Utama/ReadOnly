import { createSignal, For, Show } from 'solid-js';
import {
  getRatingValidationMessage,
  type MemberLoan,
  requestLoanReturn,
} from '../../api/loan-workflows';
import Modal from '../Modal';

interface ReturnFeedbackModalProps {
  loan: MemberLoan;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReturnFeedbackModal(props: ReturnFeedbackModalProps) {
  const [score, setScore] = createSignal(0);
  const [error, setError] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const validationMessage = getRatingValidationMessage(score());

    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    if (submitting()) return;

    setSubmitting(true);
    setError('');
    try {
      await requestLoanReturn(props.loan.id, score());
      props.onSubmitted();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Pengembalian gagal. Silakan coba lagi.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Feedback Buku"
      onClose={() => {
        if (!submitting()) props.onClose();
      }}
      class="return-feedback-modal"
    >
      <form onSubmit={submit}>
        <p class="return-feedback-book">{props.loan.book_title}</p>
        <fieldset class="return-feedback-rating">
          <legend>Berikan rating 1–5 bintang</legend>
          <div class="return-feedback-stars">
            <For each={[1, 2, 3, 4, 5]}>
              {(value) => (
                <button
                  type="button"
                  classList={{ selected: score() >= value }}
                  aria-label={`${value} bintang`}
                  aria-pressed={score() === value}
                  onClick={() => {
                    setScore(value);
                    setError('');
                  }}
                >
                  ★
                </button>
              )}
            </For>
          </div>
        </fieldset>

        <Show when={error()}>
          <p class="return-feedback-error" role="alert">
            {error()}
          </p>
        </Show>

        <div class="form-actions">
          <button
            class="button secondary"
            type="button"
            onClick={props.onClose}
            disabled={submitting()}
          >
            Batal
          </button>
          <button class="button" type="submit" disabled={submitting()}>
            {submitting() ? 'Memproses…' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
