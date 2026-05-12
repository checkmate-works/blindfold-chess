'use client';

import { useState, useTransition } from 'react';

import { BoardAnnotationEditor } from '@/lib/board-annotations/BoardAnnotationEditor';
import type { BoardAnnotations } from '@/lib/board-annotations/types';

import { updateTermPositionAnnotations } from '../_actions/updateTermPositionAnnotations';

type Props = {
  rowId: string;
  termSlug: string;
  fen: string;
  caption: string | null;
  initialAnnotations: BoardAnnotations;
};

/**
 * One example position's editor row in the admin term page.
 *
 * Owns its own local annotation state plus a Save button so each row
 * commits independently — a connection blip or a save failure on one
 * position never wipes pending edits on the others. The button shows
 * a dirty indicator (`*`) when local state diverges from the
 * last-saved snapshot.
 *
 * The FEN and caption stay read-only here because they are master
 * data (managed in `apps/web/src/lib/db/data/terms/*.ts`); changing
 * them belongs in code-and-PR rather than the admin UI.
 */
export function TermPositionEditor({ rowId, termSlug, fen, caption, initialAnnotations }: Props) {
  const [annotations, setAnnotations] = useState<BoardAnnotations>(initialAnnotations);
  const [savedSnapshot, setSavedSnapshot] = useState<BoardAnnotations>(initialAnnotations);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const isDirty = annotations !== savedSnapshot;

  function handleSave() {
    setError(null);
    const payload = annotations;
    startTransition(async () => {
      const result = await updateTermPositionAnnotations(rowId, termSlug, payload);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setSavedSnapshot(payload);
      setSavedAt(new Date());
    });
  }

  return (
    <div className="p-4 rounded border border-border space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-muted-foreground font-mono break-all min-w-0">{fen}</div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="px-3 py-1 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
        >
          {isPending ? 'Saving...' : isDirty ? 'Save*' : 'Saved'}
        </button>
      </div>

      {caption && <p className="text-sm text-muted-foreground italic">{caption}</p>}

      <div className="max-w-sm">
        <BoardAnnotationEditor
          fen={fen}
          value={annotations}
          onChange={setAnnotations}
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="p-2 rounded bg-destructive-soft text-destructive-soft-foreground text-xs">
          {error}
        </div>
      )}
      {!error && savedAt && !isDirty && (
        <p className="text-xs text-muted-foreground">Saved at {savedAt.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
