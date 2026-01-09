'use client';

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
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            {labels.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
