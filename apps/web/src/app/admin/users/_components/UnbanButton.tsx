'use client';

import { ConfirmActionButton } from '@/app/[locale]/_components/ConfirmActionButton';

import { unbanUser } from '../_actions/unbanUser';

export function UnbanButton({ userId }: { userId: string }) {
  return (
    <ConfirmActionButton
      trigger={
        <button
          type="button"
          className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          Unban
        </button>
      }
      title="Unban User"
      message="Are you sure you want to unban this user? They will regain full access to the platform."
      confirmLabel="Confirm Unban"
      pendingLabel="Unbanning..."
      confirmVariant="primary"
      onConfirm={async () => {
        const result = await unbanUser(userId);
        if ('error' in result) {
          return result;
        }
      }}
    />
  );
}
