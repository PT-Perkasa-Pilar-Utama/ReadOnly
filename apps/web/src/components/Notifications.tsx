import {
  LOGIN_POPUP_CONDITION_ORDER,
  LOGIN_POPUP_DURATION_MS,
} from '@readonly/shared';
import { createQuery } from '@tanstack/solid-query';
import { useLocation } from '@tanstack/solid-router';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { catalogSchema, type Popup } from '../api/contracts';
import { getNotifications } from '../api/notifications';
import { queryClient } from '../lib/query';
import { consumeLoginReminders, hasLoginReminders } from '../lib/session';
import { BookCover } from './BookCard';
import { ErrorNotice, Loading } from './Feedback';
import Icon from './Icon';
import Pagination from './Pagination';

export function NotificationsMenu() {
  const [open, setOpen] = createSignal(false);
  const [page, setPage] = createSignal(1);
  const notifications = createQuery(() => ({
    queryKey: ['notifications', page()],
    queryFn: () => getNotifications(page()),
    enabled: open(),
  }));
  let wrapper!: HTMLDivElement;
  // AC-10.01–AC-10.03: gunakan cover katalog yang sudah dimuat; kontrak notifikasi belum menyertakan cover.
  function coverFor(title: string) {
    for (const [, cached] of queryClient.getQueriesData({
      queryKey: ['books'],
    })) {
      const catalog = catalogSchema.safeParse(cached);
      if (!catalog.success) continue;
      const book = [...catalog.data.data, ...catalog.data.recommendations].find(
        (item) => item.title === title,
      );
      if (book) return book.cover_url;
    }
    return undefined;
  }
  createEffect(() => {
    if (!open()) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.contains(event.target))
        setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        wrapper.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', handleEscape);
    onCleanup(() => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', handleEscape);
    });
  });
  return (
    <div class="notifications-wrapper" ref={wrapper}>
      <button
        type="button"
        class="icon-button notification-trigger"
        aria-label="Notifikasi"
        aria-expanded={open()}
        aria-controls="notification-panel"
        onClick={() => setOpen(!open())}
      >
        <Icon name="bell" size={21} />
      </button>
      <Show when={open()}>
        <section
          class="notification-panel"
          id="notification-panel"
          aria-labelledby="notification-heading"
        >
          <header>
            <h2 id="notification-heading">Notifikasi</h2>
            <button
              type="button"
              class="icon-button"
              aria-label="Tutup notifikasi"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" size={17} />
            </button>
          </header>
          {/* AC-10.01–AC-10.03: daftar persisten tetap utuh setelah popup ditutup. */}
          <Show when={notifications.isPending}>
            <Loading />
          </Show>
          <Show when={notifications.isError}>
            <ErrorNotice
              error={notifications.error}
              retry={() => void notifications.refetch()}
            />
          </Show>
          <Show when={notifications.data} keyed>
            {(data) => (
              <>
                <Show
                  when={data.data.length}
                  fallback={<p class="empty-inline">Belum ada notifikasi.</p>}
                >
                  <ul class="notification-list">
                    <For each={data.data}>
                      {(item) => (
                        <li>
                          <Show
                            when={coverFor(item.book_title)}
                            fallback={
                              <span
                                class="notification-cover cover-fallback"
                                aria-hidden="true"
                              >
                                <Icon name="book" size={22} />
                              </span>
                            }
                          >
                            {(src) => (
                              <BookCover
                                class="notification-cover"
                                src={src()}
                                title={item.book_title}
                              />
                            )}
                          </Show>
                          <div>
                            <h3>{item.title}</h3>
                            <Show when={item.text}>
                              <p>{item.text}</p>
                            </Show>
                            <time dateTime={item.created_at}>
                              {new Intl.DateTimeFormat('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Jakarta',
                              }).format(new Date(item.created_at))}
                            </time>
                          </div>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <Show when={data.pagination.totalPages > 1}>
                  <Pagination
                    pagination={data.pagination}
                    noun="notifikasi"
                    onChange={setPage}
                  />
                </Show>
              </>
            )}
          </Show>
        </section>
      </Show>
    </div>
  );
}

export function ReminderHost() {
  const location = useLocation();
  const [pending, setPending] = createSignal(hasLoginReminders());
  const [queue, setQueue] = createSignal<Popup[]>([]);
  const [index, setIndex] = createSignal(0);
  const response = createQuery(() => ({
    queryKey: ['notifications', 1],
    queryFn: () => getNotifications(1),
    enabled: pending() && location().pathname === '/home',
  }));
  createEffect(() => {
    if (!pending() || !response.data || location().pathname !== '/home') return;
    const ordered = [...response.data.login_popups].sort(
      (a, b) =>
        LOGIN_POPUP_CONDITION_ORDER.indexOf(a.condition) -
        LOGIN_POPUP_CONDITION_ORDER.indexOf(b.condition),
    );
    setQueue(ordered.filter((popup) => popup.books.length));
    consumeLoginReminders();
    setPending(false);
  });
  const current = () => queue()[index()];
  const next = () => setIndex((previous) => previous + 1);
  createEffect(() => {
    if (!current()) return;
    // AC-10.04–AC-10.07: satu kondisi per popup, tiga detik, prioritas terlambat dulu.
    const timer = setTimeout(next, LOGIN_POPUP_DURATION_MS);
    onCleanup(() => clearTimeout(timer));
  });
  return (
    <>
      <Show when={pending() && response.isError}>
        <div class="reminder-error">
          <ErrorNotice
            error={response.error}
            retry={() => void response.refetch()}
          />
        </div>
      </Show>
      <Show when={current()} keyed>
        {(popup) => (
          <section
            class="reminder-popup"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label="Pengingat peminjaman"
          >
            <span class={`reminder-symbol ${popup.condition.toLowerCase()}`}>
              <Icon
                name={popup.condition === 'OVERDUE' ? 'warning' : 'bell'}
                size={19}
              />
            </span>
            <div class="reminder-books">
              <For each={popup.books}>
                {(book) => (
                  <div>
                    <p>{book.message}</p>
                    <Show when={popup.condition === 'DUE_SOON'}>
                      <span>
                        {book.book_title} ·{' '}
                        {new Intl.DateTimeFormat('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'Asia/Jakarta',
                        }).format(new Date(`${book.due_date}T12:00:00+07:00`))}
                      </span>
                    </Show>
                  </div>
                )}
              </For>
            </div>
            {/* PDF AC-10.07 = repo AC-10.08: X melanjutkan antrean tanpa menghapus notifikasi. */}
            <button
              type="button"
              class="icon-button"
              aria-label="Tutup pengingat"
              onClick={next}
            >
              <Icon name="close" size={18} />
            </button>
          </section>
        )}
      </Show>
    </>
  );
}
