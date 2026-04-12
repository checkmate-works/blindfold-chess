'use client';

import { useState } from 'react';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { unbanUser } from '../_actions/unbanUser';

export function UnbanButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnban() {
    setIsPending(true);
    setError(null);

    const result = await unbanUser(userId);

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
        className="px-3 py-1 text-xs font-medium rounded bg-success text-success-foreground hover:opacity-80 transition-opacity"
      >
        Unban
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title="Unban User"
        message="Are you sure you want to unban this user? They will regain full access to the platform."
        confirmText="Confirm Unban"
        cancelText="Cancel"
        confirmVariant="primary"
        isLoading={isPending}
        error={error}
        onConfirm={handleUnban}
        onCancel={handleCancel}
      />
    </>
  );
}
