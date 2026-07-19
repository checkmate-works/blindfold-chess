'use client';

import { useConfirmModalAction } from '@/app/admin/_hooks/useConfirmModalAction';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { unbanUser } from '../_actions/unbanUser';

export function UnbanButton({ userId }: { userId: string }) {
  const { isOpen, open, cancel, isPending, error, run } = useConfirmModalAction();

  async function handleUnban() {
    await run(() => unbanUser(userId));
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
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
        onCancel={cancel}
      />
    </>
  );
}
