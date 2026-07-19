'use client';

import { useRef } from 'react';

import { Textarea } from '@/app/_components';
import { useConfirmModalAction } from '@/app/admin/_hooks/useConfirmModalAction';

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
  const { isOpen, open, cancel, isPending, error, setError, run } = useConfirmModalAction();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  async function handleDelete() {
    const reason = reasonRef.current?.value.trim();
    if (!reason) {
      setError(labels.deleteModalReasonRequired);
      return;
    }

    await run(() => deletePostAdmin(postId, reason));
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
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
        onCancel={cancel}
      >
        <label htmlFor={`delete-reason-${postId}`} className="block text-sm font-medium mb-2">
          {labels.deleteModalReasonLabel}
        </label>
        <Textarea
          id={`delete-reason-${postId}`}
          ref={reasonRef}
          inputSize="sm"
          rows={3}
          maxLength={1000}
          placeholder={labels.deleteModalReasonPlaceholder}
        />
      </ConfirmationModal>
    </>
  );
}
