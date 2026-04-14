'use client';

import { useState } from 'react';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type AdminDeleteButtonProps = {
  id: string;
  title: string;
  deleteAction: (id: string) => Promise<{ error: string } | { success: true }>;
  labels: {
    deleteButton: string;
    modalTitle: string;
    modalMessage: string;
    cancel: string;
    confirm: string;
    deleting: string;
  };
};

export function AdminDeleteButton({ id, title, deleteAction, labels }: AdminDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deleteAction(id);

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
        className="px-3 py-1 text-xs font-medium rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
      >
        {labels.deleteButton}
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title={labels.modalTitle}
        confirmText={isPending ? labels.deleting : labels.confirm}
        cancelText={labels.cancel}
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleDelete}
        onCancel={handleCancel}
      >
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-medium text-foreground">{title}</span>
        </p>
        <p className="text-sm text-muted-foreground">{labels.modalMessage}</p>
      </ConfirmationModal>
    </>
  );
}
