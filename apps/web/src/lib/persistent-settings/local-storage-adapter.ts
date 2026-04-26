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
export const localStorageAdapter: PersistentStorage = {
  get(key) {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Swallow quota / private-mode errors.
    }
  },
};
