'use client';

import { useConfirmModalAction } from '@/app/admin/_hooks/useConfirmModalAction';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { revokeGrant } from '../_actions/revokeGrant';

export function RevokeButton({ grantId }: { grantId: string }) {
  const { isOpen, open, cancel, isPending, error, run } = useConfirmModalAction();

  async function handleRevoke() {
    await run(() => revokeGrant(grantId));
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity"
      >
        Revoke
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title="Revoke Grant"
        confirmText={isPending ? 'Revoking...' : 'Revoke'}
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleRevoke}
        onCancel={cancel}
      >
        <p className="text-sm text-muted-foreground">Are you sure you want to revoke this grant?</p>
      </ConfirmationModal>
    </>
  );
}
