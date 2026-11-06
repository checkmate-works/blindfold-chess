'use client';

import { useMemo } from 'react';

import { type FieldGuard, pickValidFields } from '@blindfold-chess/features/common';
import { usePersistentSettings } from '@blindfold-chess/features/common/client';
import type { UsePersistentSettingsReturn } from '@blindfold-chess/features/common/client';

import { localStorageAdapter } from './local-storage-adapter';

/**
 * Web-local wrapper that injects the SSR-safe `localStorageAdapter` into the
 * shared `usePersistentSettings` hook, keeping the `(storageKey, defaults)`
 * call signature; mobile's counterpart is `useAsyncStorageSettings`.
 *
 * `guards` names a check for every field, and is required so a new module
 * cannot forget it: a stored value is whatever an older build wrote, and a
 * field that fails its check loads as the default instead of reaching a
 * component that cannot render it (see `pickValidFields`). Nothing is
 * rewritten on load, so the key and its JSON shape are unchanged and the
 * repaired value is only stored with the player's next change.
 *
 * This is the store for PER-MODULE practice settings (time limit, piece,
 * orientation: `coordinateQuiz_settings` and friends). The GLOBAL board
 * preferences (`showCoordinates`, piece set, board visibility) are a
 * different mechanism — `GamePreferencesContext` in
 * `app/[locale]/_contexts/`, which hand-rolls localStorage plus a cookie
 * hint for SSR and cross-tab sync — and nothing syncs either store between
 * devices or with mobile, whose modules use their own keys.
 */
export function useLocalStorageSettings<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
  guards: { [K in keyof T]: FieldGuard<T[K]> }
): UsePersistentSettingsReturn<T> {
  // The hook reads `validate` through a ref, so a new function per render
  // costs nothing; the memo only keeps the identity stable for readers.
  const validate = useMemo(() => (parsed: unknown) => pickValidFields<T>(parsed, guards), [guards]);
  return usePersistentSettings<T>({
    storageKey,
    defaults,
    storage: localStorageAdapter,
    validate,
  });
}
