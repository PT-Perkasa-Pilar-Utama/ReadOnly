import { createQuery } from '@tanstack/solid-query';
import { Link, useNavigate } from '@tanstack/solid-router';
import { createSignal, For, Show } from 'solid-js';
import { getGenres, register } from '@web/api/auth';
import { ApiError } from '@web/api/client';
import AuthLayout from '@web/components/AuthLayout';
import { ErrorNotice, Loading, notify } from '@web/components/Feedback';
import Icon from '@web/components/Icon';
import {
  clearRegistration,
  registrationDraft,
} from '@web/pages/RegisterStep1/draft';

export default function GenresPage() {
  const navigate = useNavigate();
  const genres = createQuery(() => ({
    queryKey: ['genres'],
    queryFn: getGenres,
  }));
  const [selected, setSelected] = createSignal<string[]>([]);
  const [error, setError] = createSignal('');
  const [failure, setFailure] = createSignal<unknown>();
  const [busy, setBusy] = createSignal(false);
  function toggle(id: string) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
    setError('');
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy()) return;
    const draft = registrationDraft();
    if (!draft) {
      await navigate({ to: '/register' });
      return;
    }
    if (!selected().length) {
      setError('Pilih minimal 1 genre');
      return;
    }
    setBusy(true);
    setFailure(undefined);
    try {
      await register({ ...draft, genres: selected() });
      clearRegistration();
      notify('Akun berhasil dibuat');
      await navigate({ to: '/login' });
    } catch (error) {
      if (error instanceof ApiError && error.field === 'genres')
        setError(error.message);
      else setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <header class="form-heading">
        <span class="eyebrow">LANGKAH 02 / 02</span>
        <h1>Pilih Genre</h1>
        <p>Silahkan pilih genre kesukaanmu.</p>
      </header>
      <Show when={genres.isPending}>
        <Loading />
      </Show>
      <Show when={genres.isError}>
        <ErrorNotice error={genres.error} retry={() => void genres.refetch()} />
      </Show>
      <Show when={failure()}>
        <ErrorNotice error={failure()} />
      </Show>
      <form onSubmit={submit} noValidate aria-busy={busy()}>
        {/* AC-01.06, AC-01.07: genre aktif dari API, multitag, minimal satu pilihan. */}
        <fieldset
          class="genre-fieldset"
          aria-describedby={error() ? 'genre-error' : undefined}
        >
          <legend class="sr-only">Genre yang diminati</legend>
          <div class="genre-grid">
            <For each={genres.data}>
              {(genre) => (
                <button
                  type="button"
                  class="genre-chip"
                  aria-pressed={selected().includes(genre.id)}
                  onClick={() => toggle(genre.id)}
                >
                  <Show when={selected().includes(genre.id)}>
                    <Icon name="check" size={14} />
                  </Show>
                  {genre.name}
                </button>
              )}
            </For>
          </div>
        </fieldset>
        <Show when={genres.isSuccess && !genres.data.length}>
          <p class="muted">Genre tidak ditemukan</p>
        </Show>
        <Show when={error()}>
          <p class="field-error" id="genre-error" role="alert">
            {error()}
          </p>
        </Show>
        <button
          class="button full"
          type="submit"
          disabled={busy() || !genres.isSuccess || !genres.data?.length}
        >
          {busy() ? 'Memproses…' : 'Daftar'}
        </button>
        <p class="auth-switch">
          <Link to="/register">Kembali ke data akun</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
