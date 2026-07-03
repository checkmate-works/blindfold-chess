'use client';

import { useEffect, useState } from 'react';

import type { FenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';

import { readChunkDraft } from '../_lib/draft-storage';
import type { ChunkFormState } from './use-chunk-form-state';

/**
 * Rehydrate the create form from a sessionStorage draft when re-entering it
 * (e.g. via the preview's "Back to edit" button).
 *
 * An injected position (`?fen=`) is an explicit seed and wins over any
 * stored draft, so recovery is skipped when one is present. `?fen=` only
 * appears on the initial entry from a game page — the preview "Back to
 * edit" round-trip navigates to a bare `/chunks/new` — so this never
 * clobbers in-progress edits. Edit mode skips this path entirely since its
 * seed data comes from the server.
 */
export function useChunkDraftRecovery({
  mode,
  injectedFen,
  board,
  form,
}: {
  mode: 'create' | 'edit';
  injectedFen: string | undefined;
  board: FenBoardEditor;
  form: ChunkFormState;
}) {
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  useEffect(() => {
    if (mode !== 'create') return;
    if (injectedFen) return;
    const draft = readChunkDraft();
    if (!draft) return;
    board.setFenInput(draft.representativeFen);
    board.setBoardFen(draft.representativeFen);
    board.setSideToMove(draft.sideToMove);
    board.setActiveTab(draft.activeTab);
    board.setFlipped(draft.flipped);
    board.setUserFlipped(draft.userFlipped);
    form.applyDraft(draft);
    setHydratedFromDraft(true);
    // The board/form hooks are stable for the lifetime of this component —
    // omit them from deps so a setter identity change doesn't re-hydrate
    // and clobber subsequent user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return { hydratedFromDraft, setHydratedFromDraft };
}
