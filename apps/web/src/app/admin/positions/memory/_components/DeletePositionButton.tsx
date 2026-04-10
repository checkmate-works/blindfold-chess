'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { deletePosition } from '../_actions/deletePosition';

export function DeletePositionButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    setPending(true);
    const result = await deletePosition(id);
    setPending(false);

    if ('error' in result) {
      alert(`Failed to delete: ${result.error}`);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground hover:opacity-80 disabled:opacity-50 transition-opacity"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
