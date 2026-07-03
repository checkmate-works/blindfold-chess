'use client';

import { AdminDeleteButton } from '@/app/admin/_components/AdminDeleteButton';

import { deletePosition } from '../_actions/deletePosition';

export function DeletePositionButton({ id, title }: { id: string; title: string }) {
  return (
    <AdminDeleteButton
      id={id}
      title={title}
      deleteAction={deletePosition}
      labels={{
        deleteButton: 'Delete',
        modalTitle: 'Delete Position',
        modalMessage: 'Are you sure you want to delete this position?',
        cancel: 'Cancel',
        confirm: 'Delete',
        deleting: 'Deleting...',
      }}
    />
  );
}
