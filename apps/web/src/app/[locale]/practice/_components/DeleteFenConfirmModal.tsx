'use client';

import { Button } from '@/app/_components';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4 border border-border">
        <h2 className="text-xl font-bold mb-4">{labels.title}</h2>
        <p className="text-muted-foreground mb-2">{labels.message}</p>
        <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted p-2 rounded break-all">
          {fen}
        </p>

        <div className="flex gap-4 justify-end">
          <Button onClick={onCancel} variant="secondary" size="sm">
            {labels.cancel}
          </Button>
          <Button onClick={onConfirm} variant="destructive" size="sm">
            {labels.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
