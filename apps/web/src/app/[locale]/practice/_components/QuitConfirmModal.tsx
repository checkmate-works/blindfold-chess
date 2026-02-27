'use client';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

export type QuitConfirmModalLabels = {
  title: string;
  message: string;
  confirmButton: string;
  cancelButton: string;
};

type Props = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  labels: QuitConfirmModalLabels;
};

export function QuitConfirmModal({ isOpen, onConfirm, onCancel, labels }: Props) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      title={labels.title}
      message={labels.message}
      confirmText={labels.confirmButton}
      cancelText={labels.cancelButton}
      confirmVariant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
