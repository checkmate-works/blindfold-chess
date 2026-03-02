'use client';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  isOpen: boolean;
  fen: string;
  onConfirm: () => void;
  onCancel: () => void;
  labels: {
    title: string;
    message: string;
    confirm: string;
    cancel: string;
  };
};

export function DeleteFenConfirmModal({ isOpen, fen, onConfirm, onCancel, labels }: Props) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      title={labels.title}
      message={labels.message}
      confirmText={labels.confirm}
      cancelText={labels.cancel}
      confirmVariant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted p-2 rounded break-all">
        {fen}
      </p>
    </ConfirmationModal>
  );
}
