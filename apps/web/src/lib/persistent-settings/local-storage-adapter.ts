import type { PersistentStorage } from '@blindfold-chess/features/common';

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
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Swallow quota / private-mode errors.
    }
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

/** Serialize and store a value for {@link readJson}. Inert on the server. */
export function writeJson(key: string, value: unknown): void {
  localStorageAdapter.set(key, JSON.stringify(value));
}
