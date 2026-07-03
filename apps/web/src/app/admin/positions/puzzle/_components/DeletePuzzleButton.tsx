'use client';

import { AdminDeleteButton } from '@/app/admin/_components/AdminDeleteButton';

import { deletePuzzle } from '../_actions/deletePuzzle';

export function DeletePuzzleButton({ id, title }: { id: string; title: string }) {
  return (
    <AdminDeleteButton
      id={id}
      title={title}
      deleteAction={deletePuzzle}
      labels={{
        deleteButton: 'Delete',
        modalTitle: 'Delete Puzzle',
        modalMessage: 'Are you sure you want to delete this puzzle?',
        cancel: 'Cancel',
        confirm: 'Delete',
        deleting: 'Deleting...',
      }}
    />
  );
}
