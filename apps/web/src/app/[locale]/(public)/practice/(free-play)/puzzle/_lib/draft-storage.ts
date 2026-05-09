import { validateFen } from '@blindfold-chess/features/chess-core';

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
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isPuzzleDraftV1(value: unknown): value is PuzzleDraftV1 {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.fen !== 'string') return false;
  if (typeof v.title !== 'string') return false;
  if (typeof v.description !== 'string') return false;
  if (!isStringArray(v.moves)) return false;
  if (!isStringArray(v.notes)) return false;
  if (v.activeTab !== 'board' && v.activeTab !== 'fen') return false;
  if (v.sideToMove !== 'w' && v.sideToMove !== 'b') return false;
  if (typeof v.flipped !== 'boolean') return false;
  if (typeof v.userFlipped !== 'boolean') return false;
  // themeIds / chunkIds are optional — accept missing (legacy drafts) or
  // valid string arrays. Anything else (e.g. malformed JSON injected by
  // a buggy producer) is treated as corrupt.
  if (v.themeIds !== undefined && !isStringArray(v.themeIds)) return false;
  if (v.chunkIds !== undefined && !isStringArray(v.chunkIds)) return false;
  return true;
}

/**
 * Read the authoring draft from sessionStorage. Returns `null` when:
 *   - sessionStorage is unavailable (private mode, iframe sandbox, SSR)
 *   - the slot is empty
 *   - the stored JSON fails to parse
 *   - the payload shape does not match `PuzzleDraftV1`
 *   - the stored FEN fails `validateFen`
 *
 * In every "corrupt payload" branch (parse failure, shape mismatch, invalid
 * FEN) the slot is cleared so the user is not stuck with a draft that can
 * never hydrate. Move-sequence validity is intentionally NOT checked here —
 * the server action re-runs `validateMoveSequence` at save time, and a
 * hydration-time rejection would trap the author in an empty form after, for
 * example, a chess-core engine update narrowed one edge-case move.
 */
export function readDraft(): PuzzleDraftV1 | null {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return null;
  }
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearDraft();
    return null;
  }

  if (!isPuzzleDraftV1(parsed)) {
    clearDraft();
    return null;
  }

  if (!validateFen(parsed.fen)) {
    clearDraft();
    return null;
  }

  return parsed;
}

/**
 * Persist a draft. Returns `true` on success, `false` when sessionStorage
 * is unavailable or the write throws (e.g., quota exceeded). Callers should
 * surface an error and NOT navigate to the preview page if this returns
 * `false` — otherwise the preview would immediately bounce back.
 */
export function writeDraft(draft: PuzzleDraftV1): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the draft slot. Safe to call even when no draft exists or
 * sessionStorage is unavailable — failures are swallowed.
 */
export function clearDraft(): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
