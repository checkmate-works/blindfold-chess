'use client';

import { useEffect, useState } from 'react';

import type { FenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';

import { readChunkDraft } from '../_lib/draft-storage';
import type { ChunkFormState } from './use-chunk-form-state';

/**
 * Rehydrate the authoring form from a sessionStorage draft when
 * re-entering it via the preview's "Back to edit" button. The intentional
 * round-trip is signalled by `resumed` (the `?resumed=1` marker the
 * preview appends), mirroring the puzzle authoring flow.
 *
 * **Create**: rehydrates whenever a draft exists (create drafts are only
 * written when advancing to the preview, so the realistic trigger is a
 * round-trip). An injected position (`?fen=`) is an explicit seed and
 * wins over any stored draft, so recovery is skipped when one is present.
 * Edit drafts sharing the single draft slot are ignored here (`draft.edit`
 * set) so a chunk being edited elsewhere doesn't leak into /new.
 *
 * **Edit**: rehydrates only on the intentional round-trip (`resumed`) and
 * only when the draft belongs to this chunk (`draft.edit.chunkId`). A
 * *fresh* entry to the edit form (from the detail page) arrives without
 * the marker and loads the server row, so a stale draft never resurrects.
 */
export function useChunkDraftRecovery({
  mode,
  injectedFen,
  editChunkId,
  resumed,
  board,
  form,
}: {
  mode: 'create' | 'edit';
  injectedFen: string | undefined;
  /** The row id when editing; used to match the draft to this chunk. */
  editChunkId: string | undefined;
  /** `true` when arriving from the preview's "Back to edit" (`?resumed=1`). */
  resumed: boolean;
  board: FenBoardEditor;
  form: ChunkFormState;
}) {
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  useEffect(() => {
    if (mode === 'edit') {
      if (!resumed || !editChunkId) return;
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
