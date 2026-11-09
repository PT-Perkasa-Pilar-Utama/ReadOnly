import { Link } from '@tanstack/solid-router';
import { createSignal, Show } from 'solid-js';
import type { Book } from '../api/contracts';
import Icon from './Icon';

export function BookCover(props: {
  src: string;
  title: string;
  class?: string;
}) {
  const [failed, setFailed] = createSignal(false);
  return (
    <div class={`book-cover ${props.class ?? ''}`}>
      <Show
        when={!failed()}
        fallback={
          <div class="cover-fallback">
            <Icon name="book" size={34} />
            <span>{props.title}</span>
          </div>
        }
      >
        <img
          src={props.src}
          alt={`Cover ${props.title}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </Show>
    </div>
  );
}
export default function BookCard(props: { book: Book }) {
  return (
    <article class="book-card">
      <Link
        to="/books/$bookId"
        params={{ bookId: props.book.id }}
        tabIndex={-1}
        aria-hidden="true"
      >
        <BookCover src={props.book.cover_url} title={props.book.title} />
      </Link>
      <div class="book-card-info">
        <h3>{props.book.title}</h3>
        <p class="book-author">{props.book.author}</p>
        <p class="book-meta">
          {props.book.genres.map((genre) => genre.name).join(', ')}{' '}
          <span aria-hidden="true">·</span> {props.book.available_count}{' '}
          tersedia
        </p>
        <div class="book-card-bottom">
          <span
            class={`badge ${props.book.is_available ? 'available' : 'unavailable'}`}
          >
            {props.book.availability_label}
          </span>
          <Link
            to="/books/$bookId"
            params={{ bookId: props.book.id }}
            aria-label={`Detail ${props.book.title}`}
          >
            Detail <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
