import { validateFen } from '@blindfold-chess/features/chess-core';

import { readDraftSlot } from '@/lib/storage/session-draft';

/**
 * What the practice authoring drafts (puzzle create/edit, position-memory)
 * share on top of `@/lib/storage/session-draft`: the fields every one of them
 * carries, and a read that also rejects a stored FEN chess-core cannot load.
 * Each draft module owns its key(s) and schema guard.
 */

export {
  clearDraftSlot as clearSessionDraft,
  writeDraftSlot as writeSessionDraft,
} from '@/lib/storage/session-draft';

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * The fields every authoring draft carries: the schema version, the position
 * being authored, its title and description, which editor tab was open, and
 * the board orientation.
 *
 * Each draft module's guard checked these six itself, in the same order, and
 * then went on to its own fields. A guard is the only thing standing between a
 * hand-edited sessionStorage payload and the form's state, so the shared half
 * is worth having in one place — a check quietly missing from one draft type
 * is a form that hydrates from data it never validated.
 *
 * Narrows only what it checks; callers keep asserting their own fields.
 */
export function hasCommonDraftFields(v: Record<string, unknown>): boolean {
  return (
    v.version === 1 &&
    typeof v.fen === 'string' &&
    typeof v.title === 'string' &&
    typeof v.description === 'string' &&
    (v.activeTab === 'board' || v.activeTab === 'fen') &&
    typeof v.flipped === 'boolean'
  );
}

/**
 * The tagging fields a *creation* draft may carry: theme and chunk selections,
 * and the id of the position this one was forked from.
 *
 * All three are optional — a legacy draft written before they existed simply
 * lacks them, and that is not corruption. Anything present but malformed is,
 * so it fails. `forkedFromId` is shape-checked only; the UUID itself is
 * re-validated server-side.
 */
export function hasOptionalTagFields(v: Record<string, unknown>): boolean {
  return (
    (v.themeIds === undefined || isStringArray(v.themeIds)) &&
    (v.chunkIds === undefined || isStringArray(v.chunkIds)) &&
    (v.forkedFromId === undefined || typeof v.forkedFromId === 'string')
  );
}

/**
 * Read a schema-versioned draft from one sessionStorage slot, per
 * `readDraftSlot`'s contract, additionally treating a stored FEN that fails
 * `validateFen` as corrupt (the slot is cleared). Move-sequence validity is
 * intentionally NOT checked here: the server re-validates at save time, and a
 * hydration-time rejection would trap the author in an empty form after, for
 * example, a chess-core engine update narrowed one edge-case move.
 */
export function readSessionDraft<T extends { fen: string }>(
  key: string,
  isValid: (value: unknown) => value is T
): T | null {
  return readDraftSlot(key, (value): value is T => isValid(value) && validateFen(value.fen));
}
