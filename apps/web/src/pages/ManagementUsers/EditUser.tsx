import { createQuery } from '@tanstack/solid-query';
import { useParams } from '@tanstack/solid-router';
import { getUser } from '@web/api/users';
import { ErrorNotice, Loading } from '@web/components/Feedback';
import { Show } from 'solid-js';
import UserForm from './UserForm';

export default function EditUserPage() {
  const params = useParams({ strict: false });
  const user = createQuery(() => ({
    queryKey: ['user', params().userId],
    queryFn: () => getUser(params().userId ?? ''),
  }));
  return (
    <main class="page-container">
      <Show when={user.isPending}>
        <Loading />
      </Show>
      <Show when={user.isError}>
        <ErrorNotice error={user.error} retry={() => void user.refetch()} />
      </Show>
      <Show when={user.data} keyed>
        {(data) => <UserForm user={data} />}
      </Show>
    </main>
  );
}
