import {
  clearSessionDraft,
  hasCommonDraftFields,
  hasOptionalTagFields,
  isStringArray,
  readSessionDraft,
  writeSessionDraft,
} from '../../_lib/session-draft-store';

/**
 * sessionStorage slot used to hand off an authoring draft between
 * `/practice/puzzle/new` and `/practice/puzzle/new/preview`. Single slot per
 * browser — only one puzzle is authored at a time on this device. The slot
 * name uses the project's `blindfold_chess_` prefix (see sibling
 * `session-storage-keys.ts` in `practice/_lib/`) to keep the devtools storage
 * inspector consistent.
 *
 * Distinct from `puzzle_result_${positionId}`: that key is UUID-keyed per
 * already-saved puzzle, whereas the draft has no positionId yet.
 */
export const DRAFT_STORAGE_KEY = 'blindfold_chess_puzzle_draft';

/**
 * Schema-versioned draft payload. `version: 1` is the only currently
 * recognized schema; `readDraft` rejects any other version as corrupt and
 * clears the slot. Bumping the version is a deliberate breaking change —
 * in-flight drafts are intentionally sacrificed at upgrade time since no
 * server state has been persisted yet.
 *
 * `themeIds` and `chunkIds` were added after the initial release. They
 * remain optional so existing v1 drafts (written before the picker
 * landed) continue to hydrate cleanly with no tags rather than being
 * silently discarded mid-author.
 *
 * `forkedFromId` was added when GitHub-style fork support landed. It is
 * optional for the same reason — pre-fork drafts must continue to hydrate.
 * Validated server-side at create time via `validateForkSource`, so the
 * client never has to trust this value.
 */
export type PuzzleDraftV1 = {
  version: 1;
  fen: string;
  title: string;
  description: string;
  moves: string[];
  notes: string[];
  activeTab: 'board' | 'fen';
  sideToMove: 'w' | 'b';
  flipped: boolean;
  userFlipped: boolean;
  themeIds?: string[];
  chunkIds?: string[];
  forkedFromId?: string;
};

function isPuzzleDraftV1(value: unknown): value is PuzzleDraftV1 {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!hasCommonDraftFields(v)) return false;
  if (!isStringArray(v.moves)) return false;
  if (!isStringArray(v.notes)) return false;
  if (v.sideToMove !== 'w' && v.sideToMove !== 'b') return false;
  if (typeof v.userFlipped !== 'boolean') return false;
  if (!hasOptionalTagFields(v)) return false;
  return true;
}

/**
 * Read the authoring draft from sessionStorage. Returns `null` (clearing the
 * slot on any corrupt payload) per `readSessionDraft`'s contract.
 */
export function readDraft(): PuzzleDraftV1 | null {
  return readSessionDraft(DRAFT_STORAGE_KEY, isPuzzleDraftV1);
}

/**
 * Persist a draft. Returns `false` (caller surfaces an error and must not
 * navigate) per `writeSessionDraft`'s contract.
 */
export function writeDraft(draft: PuzzleDraftV1): boolean {
  return writeSessionDraft(DRAFT_STORAGE_KEY, draft);
}

/** Remove the draft slot. Safe to call unconditionally. */
export function clearDraft(): void {
  clearSessionDraft(DRAFT_STORAGE_KEY);
}
