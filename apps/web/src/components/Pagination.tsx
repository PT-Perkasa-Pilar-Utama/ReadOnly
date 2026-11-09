import type { Pagination as PaginationData } from '@readonly/shared';
import { For, Show } from 'solid-js';
import Icon from './Icon';

export default function Pagination(props: {
  pagination: PaginationData;
  onChange: (page: number) => void;
  noun: string;
}) {
  const start = () =>
    Math.max(
      1,
      Math.min(props.pagination.page - 2, props.pagination.totalPages - 4),
    );
  const pages = () =>
    Array.from(
      { length: Math.min(5, props.pagination.totalPages) },
      (_, index) => start() + index,
    );
  return (
    <div class="pagination-row">
      <span class="muted">
        Menampilkan{' '}
        {props.pagination.total
          ? (props.pagination.page - 1) * props.pagination.limit + 1
          : 0}
        –
        {Math.min(
          props.pagination.page * props.pagination.limit,
          props.pagination.total,
        )}{' '}
        dari {props.pagination.total} {props.noun}
      </span>
      <Show when={props.pagination.totalPages > 1}>
        <nav class="pagination" aria-label={`Halaman ${props.noun}`}>
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={props.pagination.page <= 1}
            onClick={() => props.onChange(props.pagination.page - 1)}
          >
            <Icon name="back" size={16} />
          </button>
          <For each={pages()}>
            {(page) => (
              <button
                type="button"
                aria-label={`Halaman ${page}`}
                aria-current={
                  page === props.pagination.page ? 'page' : undefined
                }
                classList={{ selected: page === props.pagination.page }}
                onClick={() => props.onChange(page)}
              >
                {page}
              </button>
            )}
          </For>
          <button
            type="button"
            aria-label="Halaman berikutnya"
            disabled={props.pagination.page >= props.pagination.totalPages}
            onClick={() => props.onChange(props.pagination.page + 1)}
          >
            <Icon name="arrow" size={16} />
          </button>
        </nav>
      </Show>
    </div>
  );
}
