'use client';

import { useRef, useState } from 'react';

import { ConfirmActionButton } from '@/app/[locale]/_components/ConfirmActionButton';

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
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  return (
    <ConfirmActionButton
      trigger={
        <button
          type="button"
          className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          {labels.deleteButton}
        </button>
      }
      title={labels.deleteModalTitle}
      message=""
      confirmLabel={labels.deleteModalConfirm}
      pendingLabel={labels.deleteModalDeleting}
      cancelLabel={labels.deleteModalCancel}
      confirmVariant="danger"
      onConfirm={async () => {
        const reason = reasonRef.current?.value.trim();
        if (!reason) {
          setReasonError(labels.deleteModalReasonRequired);
          return { error: '' };
        }
        setReasonError(null);

        const result = await deletePostAdmin(postId, reason);
        if ('error' in result) {
          return result;
        }
      }}
    >
      <div className="mt-2">
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
        {reasonError && <p className="text-red-600 text-sm mt-1">{reasonError}</p>}
      </div>
    </ConfirmActionButton>
  );
}
