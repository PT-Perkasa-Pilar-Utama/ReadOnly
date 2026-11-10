import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { useNavigate } from '@tanstack/solid-router';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import {
  type BookGenre,
  createAdminBook,
  getAdminBook,
  getAdminGenres,
  getCoverValidationMessage,
  getGenreIdsForSubmit,
  updateAdminBook,
} from '../../api/books';
import { ApiRequestError } from '../../api/client';
import { AdminHeader } from '../../components/AdminHeader';
import { showAdminFeedback } from '../../components/admin-feedback-store';
import './MasterBooksPage.css';

type BookFormPageProps = { mode: 'create' } | { mode: 'edit'; bookId: string };

type BookField =
  | 'cover'
  | 'title'
  | 'author'
  | 'publisher'
  | 'publication_year'
  | 'synopsis'
  | 'genre'
  | 'available_count';

type BookFieldErrors = Partial<Record<BookField, string>>;

const REQUIRED_FIELD_MESSAGE = 'Field harus diisi!';
const COVER_FORMAT_MESSAGE = 'Format file cover buku tidak sesuai';
const COVER_SIZE_MESSAGE = 'Ukuran file cover buku tidak boleh lebih dari 5Mb';

function getApiField(value: unknown): BookField | null {
  if (typeof value !== 'object' || value === null || !('field' in value)) {
    return null;
  }

  const field = value.field;
  const fieldMap: Record<string, BookField> = {
    cover: 'cover',
    title: 'title',
    author: 'author',
    publisher: 'publisher',
    publication_year: 'publication_year',
    synopsis: 'synopsis',
    genre_ids: 'genre',
    available_count: 'available_count',
  };

  return typeof field === 'string' ? (fieldMap[field] ?? null) : null;
}

export function BookFormPage(props: BookFormPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = createSignal('');
  const [author, setAuthor] = createSignal('');
  const [publisher, setPublisher] = createSignal('');
  const [publicationYear, setPublicationYear] = createSignal('');
  const [synopsis, setSynopsis] = createSignal('');
  const [availableCount, setAvailableCount] = createSignal('');
  const [selectedGenreId, setSelectedGenreId] = createSignal('');
  const [originalGenres, setOriginalGenres] = createSignal<BookGenre[]>([]);
  const [selectedCover, setSelectedCover] = createSignal<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = createSignal<string | null>(
    null,
  );
  const [existingCoverUrl, setExistingCoverUrl] = createSignal<string | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = createSignal<BookFieldErrors>({});
  const [formError, setFormError] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isInitialized, setIsInitialized] = createSignal(false);
  const editingBookId = props.mode === 'edit' ? props.bookId : '';

  const genresQuery = createQuery(() => ({
    queryKey: ['admin', 'book-genre-options'],
    queryFn: ({ signal }) => getAdminGenres(signal),
    staleTime: 60_000,
  }));

  const bookQuery = createQuery(() => ({
    queryKey: ['admin', 'books', 'detail', editingBookId],
    queryFn: ({ signal }) => getAdminBook(editingBookId, signal),
    enabled: editingBookId.length > 0,
  }));

  createEffect(() => {
    const book = bookQuery.data;
    if (props.mode !== 'edit' || !book || isInitialized()) {
      return;
    }

    setTitle(book.title);
    setAuthor(book.author);
    setPublisher(book.publisher);
    setPublicationYear(String(book.publication_year));
    setSynopsis(book.synopsis);
    setAvailableCount(String(book.available_count));
    setSelectedGenreId(book.genres[0]?.id ?? '');
    setOriginalGenres(book.genres.map((genre) => ({ ...genre })));
    setExistingCoverUrl(book.cover_url);
    setIsInitialized(true);
  });

  onCleanup(() => {
    const previewUrl = coverPreviewUrl();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  });

  function clearErrors() {
    setFieldErrors({});
    setFormError('');
  }

  function setFieldError(field: BookField, message: string) {
    setFieldErrors((previous) => ({ ...previous, [field]: message }));
  }

  function handleCoverChange(file: File | null) {
    const previousPreview = coverPreviewUrl();
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
    }

    setSelectedCover(file);
    setCoverPreviewUrl(file ? URL.createObjectURL(file) : null);
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next.cover;
      return next;
    });
    setFormError('');
  }

  function validateForm(): boolean {
    const errors: BookFieldErrors = {};

    if (props.mode === 'create' && !selectedCover()) {
      errors.cover = REQUIRED_FIELD_MESSAGE;
    }
    if (!title().trim()) errors.title = REQUIRED_FIELD_MESSAGE;
    if (!author().trim()) errors.author = REQUIRED_FIELD_MESSAGE;
    if (!publisher().trim()) errors.publisher = REQUIRED_FIELD_MESSAGE;
    if (
      !publicationYear().trim() ||
      !Number.isInteger(Number(publicationYear()))
    ) {
      errors.publication_year = REQUIRED_FIELD_MESSAGE;
    }
    if (!synopsis().trim()) errors.synopsis = REQUIRED_FIELD_MESSAGE;
    if (!selectedGenreId()) errors.genre = REQUIRED_FIELD_MESSAGE;
    if (
      !availableCount().trim() ||
      !Number.isInteger(Number(availableCount())) ||
      Number(availableCount()) < 0
    ) {
      errors.available_count = REQUIRED_FIELD_MESSAGE;
    }

    const cover = selectedCover();
    if (cover) {
      const coverError = getCoverValidationMessage(cover);
      if (coverError) {
        errors.cover = coverError;
        showAdminFeedback(coverError, 'error');
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleRequestError(error: unknown) {
    if (!(error instanceof ApiRequestError)) {
      setFormError(error instanceof Error ? error.message : '');
      return;
    }

    if (error.message === REQUIRED_FIELD_MESSAGE) {
      const field = getApiField(error.data);
      if (field) {
        setFieldError(field, error.message);
      } else {
        setFormError(error.message);
      }
      return;
    }

    if (
      error.message === COVER_FORMAT_MESSAGE ||
      error.message === COVER_SIZE_MESSAGE
    ) {
      setFieldError('cover', error.message);
      showAdminFeedback(error.message, 'error');
      return;
    }

    setFormError(error.message);
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    clearErrors();

    if (!validateForm()) {
      return;
    }

    const payload = new FormData();
    const cover = selectedCover();
    if (cover) {
      payload.append('cover', cover);
    }
    payload.append('title', title().trim());
    payload.append('author', author().trim());
    payload.append('publisher', publisher().trim());
    payload.append('publication_year', publicationYear());
    payload.append('synopsis', synopsis().trim());
    payload.append('available_count', availableCount());

    const genreIds = getGenreIdsForSubmit(selectedGenreId(), originalGenres());
    for (const genreId of genreIds) {
      payload.append('genre_ids', genreId);
    }

    setIsSubmitting(true);

    try {
      if (props.mode === 'create') {
        await createAdminBook(payload);
      } else {
        await updateAdminBook(props.bookId, payload);
      }

      await queryClient.invalidateQueries({
        queryKey: ['admin', 'books', 'list'],
      });
      await navigate({ to: '/admin/books' });
      showAdminFeedback(
        props.mode === 'create'
          ? 'Buku berhasil ditambahkan'
          : 'Buku berhasil diubah',
        'success',
      );
    } catch (error) {
      handleRequestError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = () =>
    genresQuery.isPending ||
    (props.mode === 'edit' &&
      (bookQuery.isPending || (!bookQuery.isError && !isInitialized())));
  const isPageError = () =>
    genresQuery.isError || (props.mode === 'edit' && bookQuery.isError);
  const currentCover = () => coverPreviewUrl() ?? existingCoverUrl();

  return (
    <div class="master-books-app">
      <AdminHeader activeSection="books" />

      <main class="master-books-main master-books-main--form">
        <div class="master-books-breadcrumb">
          <a href="/admin/books">Master Buku</a>
          <span aria-hidden="true">/</span>
          <span>{props.mode === 'create' ? 'Tambah Buku' : 'Edit Buku'}</span>
        </div>

        <section class="master-books-heading master-books-heading--form">
          <div>
            <h1>{props.mode === 'create' ? 'Tambah Buku' : 'Edit Buku'}</h1>
            <p class="master-books-subtitle">
              {props.mode === 'create'
                ? 'Tambahkan data buku ke perpustakaan'
                : 'Perbarui informasi buku perpustakaan'}
            </p>
          </div>
        </section>

        <Show when={isLoading()}>
          <div class="master-books-state" aria-live="polite" aria-busy="true">
            <span class="master-books-loader" aria-hidden="true" />
          </div>
        </Show>

        <Show when={isPageError()}>
          <div
            class="master-books-state master-books-state--error"
            role="alert"
          >
            {genresQuery.isError
              ? genresQuery.error.message
              : bookQuery.error instanceof Error
                ? bookQuery.error.message
                : ''}
          </div>
        </Show>

        <Show when={!isLoading() && !isPageError()}>
          <form class="master-books-form" onSubmit={handleSubmit}>
            <div class="master-books-form__layout">
              <section
                class="master-books-cover-section"
                aria-labelledby="cover-label"
              >
                <p id="cover-label" class="master-books-form-label">
                  Upload Cover Buku
                  <Show when={props.mode === 'create'}>
                    <span class="master-books-required">*</span>
                  </Show>
                </p>
                <label class="master-books-cover-dropzone">
                  <input
                    class="master-books-file-input"
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg,image/jpg"
                    onChange={(event) =>
                      handleCoverChange(event.currentTarget.files?.[0] ?? null)
                    }
                    aria-label="Upload Cover Buku"
                  />
                  <Show
                    when={currentCover()}
                    fallback={
                      <span class="master-books-cover-placeholder">
                        <span
                          class="master-books-cover-placeholder__icon"
                          aria-hidden="true"
                        >
                          ⇧
                        </span>
                        <strong>Upload cover buku</strong>
                        <small>PNG, JPG, JPEG · Maks. 5Mb</small>
                      </span>
                    }
                  >
                    <img
                      class="master-books-form-cover-preview"
                      src={currentCover() ?? ''}
                      alt="Preview cover buku"
                    />
                  </Show>
                </label>
                <Show when={fieldErrors().cover === REQUIRED_FIELD_MESSAGE}>
                  <span class="master-books-field-error" role="alert">
                    {REQUIRED_FIELD_MESSAGE}
                  </span>
                </Show>
              </section>

              <div class="master-books-form-fields">
                <label class="master-books-form-field master-books-form-field--full">
                  <span class="master-books-form-label">
                    Judul Buku <span class="master-books-required">*</span>
                  </span>
                  <input
                    type="text"
                    value={title()}
                    onInput={(event) => setTitle(event.currentTarget.value)}
                    aria-invalid={Boolean(fieldErrors().title)}
                    aria-describedby={
                      fieldErrors().title ? 'book-title-error' : undefined
                    }
                  />
                  <Show when={fieldErrors().title}>
                    <small
                      id="book-title-error"
                      class="master-books-field-error"
                    >
                      {fieldErrors().title}
                    </small>
                  </Show>
                </label>

                <label class="master-books-form-field">
                  <span class="master-books-form-label">
                    Penulis <span class="master-books-required">*</span>
                  </span>
                  <input
                    type="text"
                    value={author()}
                    onInput={(event) => setAuthor(event.currentTarget.value)}
                    aria-invalid={Boolean(fieldErrors().author)}
                  />
                  <Show when={fieldErrors().author}>
                    <small class="master-books-field-error">
                      {fieldErrors().author}
                    </small>
                  </Show>
                </label>

                <label class="master-books-form-field">
                  <span class="master-books-form-label">
                    Penerbit <span class="master-books-required">*</span>
                  </span>
                  <input
                    type="text"
                    value={publisher()}
                    onInput={(event) => setPublisher(event.currentTarget.value)}
                    aria-invalid={Boolean(fieldErrors().publisher)}
                  />
                  <Show when={fieldErrors().publisher}>
                    <small class="master-books-field-error">
                      {fieldErrors().publisher}
                    </small>
                  </Show>
                </label>

                <label class="master-books-form-field">
                  <span class="master-books-form-label">
                    Tahun Terbit <span class="master-books-required">*</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    value={publicationYear()}
                    onInput={(event) =>
                      setPublicationYear(event.currentTarget.value)
                    }
                    aria-invalid={Boolean(fieldErrors().publication_year)}
                  />
                  <Show when={fieldErrors().publication_year}>
                    <small class="master-books-field-error">
                      {fieldErrors().publication_year}
                    </small>
                  </Show>
                </label>

                <label class="master-books-form-field">
                  <span class="master-books-form-label">
                    Genre <span class="master-books-required">*</span>
                  </span>
                  <select
                    value={selectedGenreId()}
                    onChange={(event) =>
                      setSelectedGenreId(event.currentTarget.value)
                    }
                    aria-invalid={Boolean(fieldErrors().genre)}
                  >
                    <option value="">Pilih Genre</option>
                    <Show
                      when={
                        props.mode === 'edit' &&
                        originalGenres().some(
                          (genre) => genre.status === 'inactive',
                        )
                      }
                    >
                      <For
                        each={originalGenres().filter(
                          (genre) => genre.status === 'inactive',
                        )}
                      >
                        {(genre) => (
                          <option value={genre.id} disabled>
                            {genre.name} (Nonaktif)
                          </option>
                        )}
                      </For>
                    </Show>
                    <For each={genresQuery.data ?? []}>
                      {(genre) => (
                        <option value={genre.id}>{genre.name}</option>
                      )}
                    </For>
                  </select>
                  <Show when={fieldErrors().genre}>
                    <small class="master-books-field-error">
                      {fieldErrors().genre}
                    </small>
                  </Show>
                </label>

                <label class="master-books-form-field master-books-form-field--full">
                  <span class="master-books-form-label">
                    Sinopsis <span class="master-books-required">*</span>
                  </span>
                  <textarea
                    rows={5}
                    value={synopsis()}
                    onInput={(event) => setSynopsis(event.currentTarget.value)}
                    aria-invalid={Boolean(fieldErrors().synopsis)}
                  />
                  <Show when={fieldErrors().synopsis}>
                    <small class="master-books-field-error">
                      {fieldErrors().synopsis}
                    </small>
                  </Show>
                </label>

                <label class="master-books-form-field master-books-form-field--full">
                  <span class="master-books-form-label">
                    Jumlah Ketersediaan{' '}
                    <span class="master-books-required">*</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={availableCount()}
                    onInput={(event) =>
                      setAvailableCount(event.currentTarget.value)
                    }
                    aria-invalid={Boolean(fieldErrors().available_count)}
                  />
                  <Show when={fieldErrors().available_count}>
                    <small class="master-books-field-error">
                      {fieldErrors().available_count}
                    </small>
                  </Show>
                </label>
              </div>
            </div>

            <Show when={formError()}>
              <div
                class="master-books-alert master-books-alert--error"
                role="alert"
              >
                {formError()}
              </div>
            </Show>

            <div class="master-books-form-actions">
              <button
                class="master-books-button master-books-button--secondary"
                type="button"
                disabled={isSubmitting()}
                onClick={() => void navigate({ to: '/admin/books' })}
              >
                Cancel
              </button>
              <button
                class="master-books-button master-books-button--primary"
                type="submit"
                disabled={isSubmitting()}
              >
                Save
              </button>
            </div>
          </form>
        </Show>
      </main>
    </div>
  );
}
