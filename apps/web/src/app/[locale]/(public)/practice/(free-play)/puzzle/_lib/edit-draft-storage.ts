import { validateFen } from '@blindfold-chess/features/chess-core';

import type { EditorTab, SideToMove } from '../../_lib/board-editor-constants';

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isPuzzleEditDraftV1(value: unknown): value is PuzzleEditDraftV1 {
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
  if (!isStringArray(v.themeIds)) return false;
  if (!isStringArray(v.chunkIds)) return false;
  return true;
}

/**
 * Read the edit draft for one puzzle from sessionStorage. Returns `null`
 * when sessionStorage is unavailable, the slot is empty, the JSON fails to
 * parse, the shape doesn't match `PuzzleEditDraftV1`, or the stored FEN
 * fails `validateFen` — clearing the slot in every "corrupt payload" branch
 * so the author is never stuck with a draft that can't hydrate. Move-
 * sequence validity is intentionally not checked here (same rationale as
 * `draft-storage.ts`'s `readDraft`): the server re-validates at save time.
 */
export function readEditDraft(positionId: string): PuzzleEditDraftV1 | null {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return null;
  }
  const key = editDraftStorageKey(positionId);
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearEditDraft(positionId);
    return null;
  }

  if (!isPuzzleEditDraftV1(parsed)) {
    clearEditDraft(positionId);
    return null;
  }

  if (!validateFen(parsed.fen)) {
    clearEditDraft(positionId);
    return null;
  }

  return parsed;
}

/**
 * Persist an edit draft for one puzzle. Returns `true` on success, `false`
 * when sessionStorage is unavailable or the write throws (e.g. quota
 * exceeded). Callers should surface an error and not navigate on `false`.
 */
export function writeEditDraft(positionId: string, draft: PuzzleEditDraftV1): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }
  try {
    sessionStorage.setItem(editDraftStorageKey(positionId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove one puzzle's edit-draft slot. Safe to call even when no draft
 * exists or sessionStorage is unavailable — failures are swallowed.
 */
export function clearEditDraft(positionId: string): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(editDraftStorageKey(positionId));
  } catch {
    // ignore
  }
}
