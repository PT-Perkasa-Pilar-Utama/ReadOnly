import { createQuery } from '@tanstack/solid-query';
import { useNavigate, useParams } from '@tanstack/solid-router';
import { getUser } from '@web/api/users';
import { ErrorNotice, Loading } from '@web/components/Feedback';
import Modal from '@web/components/Modal';
import { Show } from 'solid-js';
import UserForm from './UserForm';

export default function EditUserPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const user = createQuery(() => ({
    queryKey: ['user', params().userId],
    queryFn: () => getUser(params().userId ?? ''),
  }));
  return (
    <>
      <Show when={!user.data}>
        <Modal
          title="Edit User"
          class="user-form-modal"
          onClose={() => void navigate({ to: '/admin/users' })}
        >
          <Show when={user.isPending}>
            <Loading />
          </Show>
          <Show when={user.isError}>
            <ErrorNotice error={user.error} retry={() => void user.refetch()} />
          </Show>
        </Modal>
      </Show>
      <Show when={user.data} keyed>
        {(data) => <UserForm user={data} />}
      </Show>
    </>
  );
}
