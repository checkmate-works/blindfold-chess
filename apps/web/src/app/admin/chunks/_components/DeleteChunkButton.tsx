import { AdminDeleteButton } from '../../_components/AdminDeleteButton';
import { deleteChunk } from '../_actions/deleteChunk';

export function DeleteChunkButton({ id, title }: { id: string; title: string }) {
  return (
    <AdminDeleteButton
      id={id}
      title={title}
      deleteAction={deleteChunk}
      labels={{
        deleteButton: 'Delete',
        modalTitle: 'Delete Chunk',
        modalMessage: 'Are you sure you want to delete this chunk?',
        cancel: 'Cancel',
        confirm: 'Delete',
        deleting: 'Deleting...',
      }}
    />
  );
}
