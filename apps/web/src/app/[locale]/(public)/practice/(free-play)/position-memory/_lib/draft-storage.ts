import {
  clearSessionDraft,
  isStringArray,
  readSessionDraft,
  writeSessionDraft,
} from '../../_lib/session-draft-store';

/**
 * sessionStorage slot used to hand off an authoring draft between
 * `/practice/position-memory/new` and `/practice/position-memory/new/preview`.
 * Single slot per browser — only one position is authored at a time on this
 * device. The slot name uses the project's `blindfold_chess_` prefix (see
 * sibling `session-storage-keys.ts` in `practice/_lib/`) to keep the devtools
 * storage inspector consistent. Distinct from the puzzle draft key
 * (`blindfold_chess_puzzle_draft`) so authoring a puzzle and a position in two
 * tabs never clobber each other.
 */
export const DRAFT_STORAGE_KEY = 'blindfold_chess_position_memory_draft';

/**
 * Schema-versioned draft payload. `version: 1` is the only currently
 * recognized schema; `readDraft` rejects any other version as corrupt and
 * clears the slot. Bumping the version is a deliberate breaking change —
 * in-flight drafts are intentionally sacrificed at upgrade time since no
 * server state has been persisted yet.
 *
 * Simpler than the puzzle draft: a position-memory entry has no solution
 * moves, and its side-to-move IS the FEN's active color (position-memory has
 * no separate side-to-move control — see `PositionFormFields`), so the draft
 * stores neither `moves`/`notes` nor `sideToMove`. `activeTab` and `flipped`
 * are the board editor's UI state, persisted so a "Back to edit" round-trip
 * restores the same viewpoint.
 *
 * `themeIds` / `chunkIds` are optional (a draft may carry no tags), and
 * `forkedFromId` is optional and only present when authoring via `?from=`;
 * it rides through to `createPosition` and is re-validated server-side.
 */
export type PositionMemoryDraftV1 = {
  version: 1;
  fen: string;
  title: string;
  description: string;
  activeTab: 'board' | 'fen';
  flipped: boolean;
  themeIds?: string[];
  chunkIds?: string[];
  forkedFromId?: string;
};

function isPositionMemoryDraftV1(value: unknown): value is PositionMemoryDraftV1 {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.fen !== 'string') return false;
  if (typeof v.title !== 'string') return false;
  if (typeof v.description !== 'string') return false;
  if (v.activeTab !== 'board' && v.activeTab !== 'fen') return false;
  if (typeof v.flipped !== 'boolean') return false;
  // themeIds / chunkIds are optional — accept missing or valid string arrays.
  if (v.themeIds !== undefined && !isStringArray(v.themeIds)) return false;
  if (v.chunkIds !== undefined && !isStringArray(v.chunkIds)) return false;
  // forkedFromId is optional and only carries a UUID string when set;
  // shape-only validation here (UUID format is re-checked server-side).
  if (v.forkedFromId !== undefined && typeof v.forkedFromId !== 'string') return false;
  return true;
}

/**
 * Read the authoring draft from sessionStorage. Returns `null` (clearing the
 * slot on any corrupt payload) per `readSessionDraft`'s contract.
 */
export function readDraft(): PositionMemoryDraftV1 | null {
  return readSessionDraft(DRAFT_STORAGE_KEY, isPositionMemoryDraftV1);
}

/**
 * Persist a draft. Returns `false` (caller surfaces an error and must not
 * navigate) per `writeSessionDraft`'s contract.
 */
export function writeDraft(draft: PositionMemoryDraftV1): boolean {
  return writeSessionDraft(DRAFT_STORAGE_KEY, draft);
}

/** Remove the draft slot. Safe to call unconditionally. */
export function clearDraft(): void {
  clearSessionDraft(DRAFT_STORAGE_KEY);
}
