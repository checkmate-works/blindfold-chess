/**
 * Guarded `sessionStorage` access.
 *
 * Reaching for `sessionStorage` directly is not safe in this app:
 * `storage-availability.ts` documents that Firefox ETP leaves the object in
 * place and throws `SecurityError` on use, and the same holds for a sandboxed
 * iframe or a full quota. The practice draft store already wrapped every one
 * of its calls in an availability check plus a try/catch for exactly that
 * reason; eight other modules called the API raw.
 *
 * One of them made the cost concrete: `use-challenge-result-save` sets a toast
 * flag inside a `.catch()` handler, so a throwing `setItem` turned a handled
 * save failure into an unhandled rejection.
 *
 * Every function here fails soft — a read gives `null`, a write does nothing.
 * These are all hand-off flags and caches whose absence degrades to "the toast
 * did not appear", never to lost user data.
 */

function available(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

/** The stored string, or `null` if absent or unreadable. */
export function readSessionItem(key: string): string | null {
  if (!available()) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store `value`; a no-op when storage is unavailable or refuses the write. */
export function writeSessionItem(key: string, value: string): void {
  if (!available()) return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Nothing to recover: the caller is stashing a flag, not user data.
  }
}

/** Remove `key`; a no-op when storage is unavailable. */
export function removeSessionItem(key: string): void {
  if (!available()) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // As above.
  }
}

/** Read and remove in one step — the shape every one-shot hand-off flag uses. */
export function takeSessionItem(key: string): string | null {
  const value = readSessionItem(key);
  if (value !== null) removeSessionItem(key);
  return value;
}
