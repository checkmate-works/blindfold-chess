import type { EditorTab, SideToMove } from '../../_lib/board-editor-constants';
import {
  clearSessionDraft,
  hasCommonDraftFields,
  isStringArray,
  readSessionDraft,
  writeSessionDraft,
} from '../../_lib/session-draft-store';

/**
 * sessionStorage key for the in-progress edit draft of a single puzzle,
 * handing state off between `/practice/puzzle/[id]/edit` and
 * `/practice/puzzle/[id]/edit/solution`. ID-scoped (unlike the single-slot
 * create draft in `draft-storage.ts`) so editing two different puzzles in the
 * same browser session — e.g. two tabs — never collides.
 */
export function editDraftStorageKey(positionId: string): string {
  return `blindfold_chess_puzzle_edit_draft_${positionId}`;
}

/**
 * Schema-versioned edit-draft payload. Mirrors `PuzzleDraftV1`'s fields minus
 * `userFlipped`/`forkedFromId`, which have no meaning for an edit in progress.
 */
export type PuzzleEditDraftV1 = {
  version: 1;
  fen: string;
  title: string;
  description: string;
  moves: string[];
  notes: string[];
  activeTab: EditorTab;
  sideToMove: SideToMove;
  flipped: boolean;
  themeIds: string[];
  chunkIds: string[];
};

function isPuzzleEditDraftV1(value: unknown): value is PuzzleEditDraftV1 {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!hasCommonDraftFields(v)) return false;
  if (!isStringArray(v.moves)) return false;
  if (!isStringArray(v.notes)) return false;
  if (v.sideToMove !== 'w' && v.sideToMove !== 'b') return false;
  // Required here, unlike a creation draft: the edit form is seeded from a
  // saved puzzle, which always has both lists.
  if (!isStringArray(v.themeIds)) return false;
  if (!isStringArray(v.chunkIds)) return false;
  return true;
}

/**
 * Read the edit draft for one puzzle from sessionStorage. Returns `null`
 * (clearing the slot on any corrupt payload) per `readSessionDraft`'s
 * contract.
 */
export function readEditDraft(positionId: string): PuzzleEditDraftV1 | null {
  return readSessionDraft(editDraftStorageKey(positionId), isPuzzleEditDraftV1);
}

/**
 * Persist an edit draft for one puzzle. Returns `false` (caller surfaces an
 * error and must not navigate) per `writeSessionDraft`'s contract.
 */
export function writeEditDraft(positionId: string, draft: PuzzleEditDraftV1): boolean {
  return writeSessionDraft(editDraftStorageKey(positionId), draft);
}

/** Remove one puzzle's edit-draft slot. Safe to call unconditionally. */
export function clearEditDraft(positionId: string): void {
  clearSessionDraft(editDraftStorageKey(positionId));
}
