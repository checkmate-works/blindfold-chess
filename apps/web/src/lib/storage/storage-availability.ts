/**
 * Browser-storage feature detection.
 *
 * Used to gate the injection of Google AdSense / Google Analytics / CMP
 * (Privacy & messaging) scripts. When the browser blocks storage (Firefox Enhanced
 * Tracking Protection, adblockers, private mode, sandboxed iframes, etc.)
 * those scripts can neither store consent nor function correctly, and they
 * tend to throw `NS_ERROR_NOT_INITIALIZED` from inside Google's bundled
 * code — which floods Sentry. The cleanest fix is to never load them at all
 * in those environments.
 *
 * SSR-tolerant: `detectStorageAvailability()` is safe to bundle into
 * server-rendered modules — every probe early-returns when the relevant
 * global is undefined, so calling it on the server returns an all-`false`
 * result without throwing. The return value is only meaningful on the
 * client, however, so consumers should reach for `useStorageAvailability()`
 * from `./useStorageAvailability` (or read the shared context from
 * `./StorageAvailabilityProvider`) rather than calling this directly.
 */

const PROBE_KEY = '__bfc_storage_probe__';

function isLocalStorageWritable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const storage = window.localStorage;
    if (!storage) return false;
    // A successful set + remove cycle is the only reliable signal across
    // Firefox ETP, Safari ITP, private mode, and quota-exceeded states. Just
    // checking `typeof window.localStorage !== 'undefined'` is not enough —
    // Firefox exposes the object but throws `SecurityError` on access.
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

function isIndexedDbWritable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    // We cannot safely `open()` a DB synchronously, so we settle for a
    // presence check (which is as close to "writable" as we can cheaply
    // get without actually opening a database). Firefox ETP and most
    // adblockers null-out / throw on property access here; both cases are
    // caught.
    return typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;
  } catch {
    return false;
  }
}

function isCookieWritable(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    // navigator.cookieEnabled lies in some configurations (returns true even
    // when document.cookie writes are no-ops), so do an actual round-trip
    // probe.
    document.cookie = `${PROBE_KEY}=1; SameSite=Lax; path=/`;
    const ok = document.cookie.includes(`${PROBE_KEY}=1`);
    if (ok) {
      document.cookie = `${PROBE_KEY}=; Max-Age=0; SameSite=Lax; path=/`;
    }
    return ok;
  } catch {
    return false;
  }
}

export type StorageAvailability = {
  /** Whether `localStorage.setItem` + `removeItem` succeed. */
  localStorage: boolean;
  /** Whether `window.indexedDB` is exposed (presence check, not an open()). */
  indexedDB: boolean;
  /** Whether `document.cookie` writes round-trip successfully. */
  cookies: boolean;
  /**
   * `true` iff every probed mechanism is usable. The Google script gate uses
   * this as its single signal — if any of the three is blocked, AdSense / GA /
   * CMP cannot reliably store consent, so we do not load them at all.
   */
  all: boolean;
};

/**
 * Probe the browser's storage APIs. Client-side only — calling this on the
 * server returns `{ localStorage: false, indexedDB: false, cookies: false,
 * all: false }` because every probe early-returns when the relevant global is
 * undefined.
 */
export function detectStorageAvailability(): StorageAvailability {
  const localStorage = isLocalStorageWritable();
  const indexedDB = isIndexedDbWritable();
  const cookies = isCookieWritable();
  return {
    localStorage,
    indexedDB,
    cookies,
    all: localStorage && indexedDB && cookies,
  };
}
