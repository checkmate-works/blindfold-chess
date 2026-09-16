import type { PersistentStorage } from '@blindfold-chess/features/common';
import { type Result, err, ok } from '@blindfold-chess/features/utils';

/**
 * Stand-in cause for a write attempted where `localStorage` does not exist at
 * all — a server render, or a browser that does not expose the object.
 * Nothing threw, so there is no real cause to hand back, and a caller that
 * logs `result.error` would otherwise print `undefined`.
 */
const NO_STORAGE = new Error('localStorage is not available in this environment');

/**
 * The single place in the app that calls `localStorage.setItem`.
 *
 * Returns the outcome rather than throwing or swallowing, so each caller can
 * pick its own posture: most ignore the result (a browser that will not store
 * a preference is not an error condition), while the saved-game repository
 * turns a failure into `{ kind: 'storage-failed' }` and keeps its in-memory
 * cache untouched so it does not start reporting a save that never landed.
 *
 * The error is whatever the browser threw — a `QuotaExceededError` at quota,
 * a `SecurityError` under Firefox ETP or in a sandboxed iframe — because that
 * distinction is the only thing that tells "the user is out of room" apart
 * from "this browser refuses storage entirely" once it reaches a log.
 *
 * `lib/storage/storage-availability.ts` answers a different question and is
 * not a substitute for this catch. It runs a one-off probe write at startup
 * to decide whether to inject AdSense / GA / CMP at all, so its answer is a
 * property of the browser, taken once. Whether *this* write lands also
 * depends on the payload — a browser with working storage still rejects the
 * save that crosses the quota — so the per-call outcome has to come from the
 * call itself.
 */
function writeRaw(key: string, value: string): Result<void, unknown> {
  if (typeof window === 'undefined') return err(NO_STORAGE);
  try {
    window.localStorage.setItem(key, value);
    return ok(undefined);
  } catch (cause) {
    // Reaching the property can throw as readily as the call: Firefox ETP
    // leaves `window.localStorage` in place and raises on access, so the
    // guard above is not a substitute for this catch.
    return err(cause);
  }
}

/**
 * SSR-safe `PersistentStorage` adapter backed by `window.localStorage`.
 *
 * Next.js App Router can execute code during server render and at build
 * time; `localStorage` is only available in the browser. Both methods
 * guard on `typeof window` so server-side calls are inert:
 * - `get` returns `null`, letting the consuming hook fall back to defaults.
 * - `set` no-ops.
 *
 * At runtime in the browser, the adapter is a thin pass-through to the
 * synchronous `localStorage` API.
 */
export const localStorageAdapter = {
  get(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    // Deliberately void: `PersistentStorage` types `set` as `void |
    // Promise<void>`, which is a union rather than bare `void`, so a
    // signature returning anything else would stop satisfying it. Callers
    // that need to know whether the write landed use `writeJson`.
    writeRaw(key, value);
  },
  // `satisfies`, not an annotation: PersistentStorage allows an async `get`
  // (the React Native adapter is), and annotating would widen this one's
  // return to `string | Promise<string | null>` for every local caller.
} satisfies PersistentStorage;

/**
 * Read a JSON value written by {@link writeJson}, falling back to `fallback`
 * when nothing is stored, the read fails, or the payload will not parse.
 *
 * Storing JSON under a key is what most callers actually want, and each was
 * re-deriving it from the raw adapter: the `typeof window` guard, the
 * try/catch around a browser that refuses storage (Safari private mode, quota),
 * and a second try/catch around `JSON.parse`. Some got only part of it —
 * `shared-game-store` guarded its read but not its write, and the knight-tour
 * setup parsed the same key twice in two `useState` initializers, each with its
 * own copy of the dance.
 *
 * The fallback is returned, not thrown: a caller reaching for persisted state
 * always has a default to fall back to, and a browser that will not store is
 * not an error condition.
 */
export function readJson<T>(key: string, fallback: T): T {
  const raw = localStorageAdapter.get(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Serialize and store a value for {@link readJson}. Inert on the server.
 *
 * The result reports whether the browser actually took the write. Ignoring it
 * is the norm and is safe — it degrades to the same silent no-op the raw
 * adapter always performed. Read it when losing the write is something the
 * caller must act on rather than merely tolerate.
 *
 * Serialization failures (a circular structure) come back through the same
 * channel, so no call to this function throws.
 */
export function writeJson(key: string, value: unknown): Result<void, unknown> {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (cause) {
    return err(cause);
  }
  return writeRaw(key, serialized);
}
