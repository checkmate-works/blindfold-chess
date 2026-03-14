'use client';

import { useRef, useState } from 'react';

import { deletePostAdmin } from '../_actions/deletePostAdmin';

export function DeletePostAdminButton({
  postId,
  labels,
}: {
  postId: string;
  labels: {
    deleteButton: string;
    deleteModalTitle: string;
    deleteModalReasonLabel: string;
    deleteModalReasonPlaceholder: string;
    deleteModalCancel: string;
    deleteModalConfirm: string;
    deleteModalDeleting: string;
    deleteModalReasonRequired: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  async function handleDelete() {
    const reason = reasonRef.current?.value.trim();
    if (!reason) {
      setError(labels.deleteModalReasonRequired);
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await deletePostAdmin(postId, reason);

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
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{labels.deleteModalTitle}</h3>

            <label htmlFor={`delete-reason-${postId}`} className="block text-sm font-medium mb-2">
              {labels.deleteModalReasonLabel}
            </label>
            <textarea
              id={`delete-reason-${postId}`}
              ref={reasonRef}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
              rows={3}
              maxLength={1000}
              placeholder={labels.deleteModalReasonPlaceholder}
            />

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm rounded bg-card border border-border hover:bg-secondary transition-colors"
                disabled={isPending}
              >
                {labels.deleteModalCancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? labels.deleteModalDeleting : labels.deleteModalConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
