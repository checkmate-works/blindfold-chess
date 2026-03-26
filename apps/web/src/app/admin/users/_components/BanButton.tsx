'use client';

import { useRef, useState } from 'react';

import { ConfirmActionButton } from '@/app/[locale]/_components/ConfirmActionButton';

import { banUser } from '../_actions/banUser';

export function BanButton({ userId }: { userId: string }) {
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  return (
    <ConfirmActionButton
      trigger={
        <button
          type="button"
          className="px-3 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Ban
        </button>
      }
      title="Ban User"
      message=""
      confirmLabel="Confirm Ban"
      pendingLabel="Banning..."
      confirmVariant="danger"
      onConfirm={async () => {
        const reason = reasonRef.current?.value.trim();
        if (!reason) {
          setReasonError('Reason is required');
          return { error: '' };
        }
        setReasonError(null);

        const result = await banUser(userId, reason);
        if ('error' in result) {
          return result;
        }
      }}
    >
      <div className="mt-2">
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
        {reasonError && <p className="text-red-600 text-sm mt-1">{reasonError}</p>}
      </div>
    </ConfirmActionButton>
  );
}
