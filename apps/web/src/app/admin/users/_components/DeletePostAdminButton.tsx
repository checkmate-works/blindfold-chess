'use client';

import { useRef, useState } from 'react';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

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

  function handleCancel() {
    setIsOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-xs font-medium rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
      >
        {labels.deleteButton}
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title={labels.deleteModalTitle}
        confirmText={labels.deleteModalConfirm}
        cancelText={labels.deleteModalCancel}
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleDelete}
        onCancel={handleCancel}
      >
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
      </ConfirmationModal>
    </>
  );
}
