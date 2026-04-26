'use client';

import { usePersistentSettings } from '@blindfold-chess/features/common/client';
import type { UsePersistentSettingsReturn } from '@blindfold-chess/features/common/client';

import { localStorageAdapter } from './local-storage-adapter';

/**
 * Web-local wrapper that injects the SSR-safe `localStorageAdapter` into the
 * shared `usePersistentSettings` hook. Preserves the legacy
 * `(storageKey, defaults)` call signature every web settings caller uses.
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
