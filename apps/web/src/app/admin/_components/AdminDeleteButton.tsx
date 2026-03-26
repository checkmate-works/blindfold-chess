'use client';

import type { ActionResult } from '@/lib/action-types';

import { ConfirmActionButton } from '@/app/[locale]/_components/ConfirmActionButton';

type AdminDeleteButtonProps = {
  id: string;
  title: string;
  deleteAction: (id: string) => Promise<ActionResult>;
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
  return (
    <ConfirmActionButton
      trigger={
        <button
          type="button"
          className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          {labels.deleteButton}
        </button>
      }
      title={labels.modalTitle}
      message={labels.modalMessage}
      confirmLabel={labels.confirm}
      pendingLabel={labels.deleting}
      cancelLabel={labels.cancel}
      confirmVariant="danger"
      onConfirm={async () => {
        const result = await deleteAction(id);
        if ('error' in result) {
          return result;
        }
      }}
    >
      <p className="text-sm text-muted-foreground mb-2">
        <span className="font-medium text-foreground">{title}</span>
      </p>
    </ConfirmActionButton>
  );
}
