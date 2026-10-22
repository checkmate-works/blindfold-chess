'use client';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useConfirmAction } from '@/app/[locale]/_hooks/use-confirm-action';

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
  const { isOpen, open, cancel, isPending, error, setError, run } = useConfirmAction();

  function handleDelete() {
    return run(
      () => deleteAction(id),
      (result) => ('error' in result ? result.error : null)
    );
  }

  function handleCancel() {
    cancel();
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
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
