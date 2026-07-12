import { validateFen } from '@blindfold-chess/features/chess-core';

/**
 * Shared sessionStorage plumbing for the puzzle authoring drafts
 * (`draft-storage.ts`, `edit-draft-storage.ts`). Each draft module owns its
 * key(s) and schema guard; this module owns the storage-availability guards,
 * JSON round-trip, and the corrupt-payload policy.
 */

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function sessionStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

/**
 * Read a schema-versioned draft from one sessionStorage slot. Returns `null`
 * when sessionStorage is unavailable (private mode, iframe sandbox, SSR) or
 * the slot is empty. In every "corrupt payload" branch — JSON parse failure,
 * `isValid` shape mismatch, or the stored FEN failing `validateFen` — the
 * slot is cleared so the author is never stuck with a draft that can't
 * hydrate. Move-sequence validity is intentionally NOT checked here: the
 * server re-validates at save time, and a hydration-time rejection would trap
 * the author in an empty form after, for example, a chess-core engine update
 * narrowed one edge-case move.
 */
export function readSessionDraft<T extends { fen: string }>(
  key: string,
  isValid: (value: unknown) => value is T
): T | null {
  if (!sessionStorageAvailable()) return null;
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
    clearSessionDraft(key);
    return null;
  }

  if (!isValid(parsed) || !validateFen(parsed.fen)) {
    clearSessionDraft(key);
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
export function writeSessionDraft(key: string, draft: unknown): boolean {
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
export function clearSessionDraft(key: string): void {
  if (!sessionStorageAvailable()) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
