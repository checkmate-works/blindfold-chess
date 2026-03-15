'use client';

import { useId } from 'react';

import { Modal } from '@/app/[locale]/_components/Modal';

type UnsavedChangesDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. Are you sure you want to leave?',
  confirmLabel = 'Leave',
  cancelLabel = 'Stay',
}: UnsavedChangesDialogProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      maxWidth="max-w-sm"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="space-y-4">
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p id={descId} className="text-sm text-muted-foreground">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-border bg-card text-foreground hover:bg-secondary transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
