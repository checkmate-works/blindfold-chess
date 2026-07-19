'use client';

import { useRef } from 'react';

import { Textarea } from '@/app/_components';
import { useConfirmModalAction } from '@/app/admin/_hooks/useConfirmModalAction';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { banUser } from '../_actions/banUser';

export function BanButton({ userId }: { userId: string }) {
  const { isOpen, open, cancel, isPending, error, setError, run } = useConfirmModalAction();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  async function handleBan() {
    const reason = reasonRef.current?.value.trim();
    if (!reason) {
      setError('Reason is required');
      return;
    }

    await run(() => banUser(userId, reason));
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
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
        onCancel={cancel}
      >
        <label htmlFor={`ban-reason-${userId}`} className="block text-sm font-medium mb-2">
          Reason for ban
        </label>
        <Textarea
          id={`ban-reason-${userId}`}
          ref={reasonRef}
          inputSize="sm"
          rows={3}
          maxLength={1000}
          placeholder="Enter reason for banning this user..."
        />
      </ConfirmationModal>
    </>
  );
}
