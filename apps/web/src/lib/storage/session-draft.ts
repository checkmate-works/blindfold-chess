import { readSessionItem, removeSessionItem, sessionStorageAvailable } from './session-storage';

/**
 * sessionStorage plumbing for authoring drafts — the typed-in content an
 * editor step hands to its preview step (chunks, puzzles, position-memory).
 *
 * Unlike the hand-off flags `session-storage.ts` serves, a draft is user
 * work, which changes two things: a failed write is reported rather than
 * swallowed, so the editor can stay put instead of navigating to a preview
 * that will bounce straight back; and a stored payload that can never
 * hydrate is cleared, so the author is not stuck behind it.
 *
 * Each draft module owns its key and schema guard; this module owns the
 * availability guards, the JSON round-trip and that corrupt-payload policy.
 */

/**
 * Read a draft from one slot. Returns `null` when sessionStorage is
 * unavailable (private mode, iframe sandbox, SSR) or the slot is empty. When
 * the stored JSON fails to parse or `isValid` rejects it, the slot is cleared
 * as well.
 */
export function readDraftSlot<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const raw = readSessionItem(key);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearDraftSlot(key);
    return null;
  }

  if (!isValid(parsed)) {
    clearDraftSlot(key);
    return null;
  }

  return parsed;
}

/**
 * Persist a draft. Returns `true` on success, `false` when sessionStorage is
 * unavailable or the write throws (e.g. quota exceeded). Callers should
 * surface an error and NOT navigate to the next step on `false` — otherwise
 * that step would immediately bounce back on its missing-draft check.
 */
export function writeDraftSlot(key: string, draft: unknown): boolean {
  if (!sessionStorageAvailable()) return false;
  try {
    sessionStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a draft slot. Safe to call even when no draft exists or
 * sessionStorage is unavailable — failures are swallowed.
 */
export function clearDraftSlot(key: string): void {
  removeSessionItem(key);
}
