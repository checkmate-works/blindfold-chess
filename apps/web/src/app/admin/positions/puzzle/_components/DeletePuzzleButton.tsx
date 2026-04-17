'use client';

import { useState } from 'react';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deletePuzzle } from '../_actions/deletePuzzle';

export function DeletePuzzleButton({ id, title }: { id: string; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deletePuzzle(id);

    if ('error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
    }
  }

  function handleCancel() {
    setIsOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
      >
        Delete
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title="Delete Puzzle"
        confirmText={isPending ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleDelete}
        onCancel={handleCancel}
      >
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-medium text-foreground">{title}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this puzzle?
        </p>
      </ConfirmationModal>
    </>
  );
}
