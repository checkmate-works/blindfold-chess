'use client';

import { useState } from 'react';

import { deleteAnnouncement } from '../_actions/deleteAnnouncement';

type DeleteAnnouncementButtonProps = {
  id: string;
  title: string;
  labels: {
    deleteButton: string;
    modalTitle: string;
    modalMessage: string;
    cancel: string;
    confirm: string;
    deleting: string;
  };
};

export function DeleteAnnouncementButton({ id, title, labels }: DeleteAnnouncementButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deleteAnnouncement(id);

    if ('error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
      >
        {labels.deleteButton}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{labels.modalTitle}</h3>

            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium text-foreground">{title}</span>
            </p>
            <p className="text-sm text-muted-foreground">{labels.modalMessage}</p>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
                disabled={isPending}
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? labels.deleting : labels.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
