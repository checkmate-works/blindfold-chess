'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { revokeGrant } from '../_actions/revokeGrant';

export function RevokeButton({ grantId }: { grantId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRevoke() {
    if (!confirm('Are you sure you want to revoke this grant?')) return;

    setPending(true);
    const result = await revokeGrant(grantId);
    setPending(false);

    if ('error' in result) {
      alert(`Failed to revoke: ${result.error}`);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={pending}
      className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:opacity-80 disabled:opacity-50 transition-opacity"
    >
      {pending ? 'Revoking...' : 'Revoke'}
    </button>
  );
}
