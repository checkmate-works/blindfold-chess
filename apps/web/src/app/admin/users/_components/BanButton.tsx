'use client';

import { useRef, useState } from 'react';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { banUser } from '../_actions/banUser';

export function BanButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  async function handleBan() {
    const reason = reasonRef.current?.value.trim();
    if (!reason) {
      setError('Reason is required');
      return;
    }

    setIsPending(true);
    setError(null);

    const result = await banUser(userId, reason);

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
        Ban
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title="Ban User"
        confirmText={isPending ? 'Banning...' : 'Confirm Ban'}
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleBan}
        onCancel={handleCancel}
      >
        <label htmlFor={`ban-reason-${userId}`} className="block text-sm font-medium mb-2">
          Reason for ban
        </label>
        <textarea
          id={`ban-reason-${userId}`}
          ref={reasonRef}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
          rows={3}
          maxLength={1000}
          placeholder="Enter reason for banning this user..."
        />
      </ConfirmationModal>
    </>
  );
}
