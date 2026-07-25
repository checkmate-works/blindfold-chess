'use client';

import { useEffect, useState } from 'react';

import type { FenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';

import { readChunkDraft, takeChunkEditResume } from '../_lib/draft-storage';
import type { ChunkFormState } from './use-chunk-form-state';

/**
 * Rehydrate the authoring form from a sessionStorage draft when
 * re-entering it via the preview's "Back to edit" button.
 *
 * **Create**: rehydrates unconditionally (with the discard banner) so an
 * in-progress or abandoned draft is never silently lost. An injected
 * position (`?fen=`) is an explicit seed and wins over any stored draft,
 * so recovery is skipped when one is present. `?fen=` only appears on the
 * initial entry from a game page — the "Back to edit" round-trip
 * navigates to a bare `/chunks/new` — so this never clobbers edits. Edit
 * drafts sharing the single draft slot are ignored here (`draft.edit`
 * set) so a chunk being edited elsewhere doesn't leak into /new.
 *
 * **Edit**: rehydrates only when the round-trip is intentional — the
 * preview's "Back to edit" sets a resume flag (`takeChunkEditResume`)
 * carrying the chunk id. A *fresh* entry to the edit form (from the
 * detail page) leaves the flag unset and loads the server row, so a
 * stale draft never resurrects. The flag is read-and-cleared on mount.
 */
export function useChunkDraftRecovery({
  mode,
  injectedFen,
  editChunkId,
  board,
  form,
}: {
  mode: 'create' | 'edit';
  injectedFen: string | undefined;
  /** The row id when editing; used to match the resume flag + draft. */
  editChunkId: string | undefined;
  board: FenBoardEditor;
  form: ChunkFormState;
}) {
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  useEffect(() => {
    if (mode === 'edit') {
      // Read-and-clear the resume flag first (even when nothing matches)
      // so it can never trigger a later rehydrate.
      const resumeId = takeChunkEditResume();
      if (!editChunkId || resumeId !== editChunkId) return;
      const editDraft = readChunkDraft();
      if (editDraft?.edit?.chunkId !== editChunkId) return;
      board.setFenInput(editDraft.representativeFen);
      board.setBoardFen(editDraft.representativeFen);
      board.setSideToMove(editDraft.sideToMove);
      board.setActiveTab(editDraft.activeTab);
      board.setFlipped(editDraft.flipped);
      board.setUserFlipped(editDraft.userFlipped);
      form.applyDraft(editDraft);
      return;
    }

    if (injectedFen) return;
    const draft = readChunkDraft();
    if (!draft) return;
    // An edit draft living in the shared slot must not hydrate /new.
    if (draft.edit) return;
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
