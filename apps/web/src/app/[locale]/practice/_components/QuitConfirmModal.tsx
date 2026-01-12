'use client';

import { Button } from '@/app/_components';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4 border border-border">
        <h2 className="text-xl font-bold mb-4">{labels.title}</h2>
        <p className="text-muted-foreground mb-6">{labels.message}</p>

        <div className="flex gap-4 justify-end">
          <Button onClick={onCancel} variant="secondary" size="sm">
            {labels.cancelButton}
          </Button>
          <Button onClick={onConfirm} variant="destructive" size="sm">
            {labels.confirmButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
