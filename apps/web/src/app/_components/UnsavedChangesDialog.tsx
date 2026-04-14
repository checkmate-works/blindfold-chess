'use client';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

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
  return (
    <ConfirmationModal
      isOpen={open}
      title={title}
      message={message}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      confirmVariant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
