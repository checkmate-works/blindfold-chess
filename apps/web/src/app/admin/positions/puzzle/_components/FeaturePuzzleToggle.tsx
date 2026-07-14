'use client';

import { useState } from 'react';

import { setPuzzleFeatured } from '../_actions/setPuzzleFeatured';

/**
 * Daily Puzzle pool toggle for a row in the admin puzzle list. Featuring is
 * low-stakes and instantly reversible, so unlike delete there is no
 * confirmation modal — the button flips membership directly and the row
 * re-renders via the action's `revalidatePath`.
 */
export function FeaturePuzzleToggle({ id, featured }: { id: string; featured: boolean }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setIsPending(true);
    setError(null);

    const result = await setPuzzleFeatured(id, !featured);

    if ('error' in result) {
      setError(result.error);
    }
    setIsPending(false);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`px-3 py-1 text-xs font-medium rounded transition-opacity hover:opacity-80 disabled:opacity-50 ${
          featured
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-foreground border border-border'
        }`}
      >
        {isPending ? '...' : featured ? '★ Featured' : '☆ Feature'}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
