'use client';

import { usePersistentSettings } from '@blindfold-chess/features/common/client';
import type { UsePersistentSettingsReturn } from '@blindfold-chess/features/common/client';

import { localStorageAdapter } from './local-storage-adapter';

/**
 * Web-local wrapper that injects the SSR-safe `localStorageAdapter` into the
 * shared `usePersistentSettings` hook, keeping the `(storageKey, defaults)`
 * call signature; mobile's counterpart is `useAsyncStorageSettings`.
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
  defaults: T
): UsePersistentSettingsReturn<T> {
  return usePersistentSettings<T>({
    storageKey,
    defaults,
    storage: localStorageAdapter,
  });
}
