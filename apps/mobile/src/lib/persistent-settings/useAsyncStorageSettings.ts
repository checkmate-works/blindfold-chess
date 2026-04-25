import { usePersistentSettings } from "@blindfold-chess/features/common";
import type { UsePersistentSettingsReturn } from "@blindfold-chess/features/common";

import { asyncStorageAdapter } from "./async-storage-adapter";

/**
 * Mobile-local wrapper that injects the AsyncStorage adapter into the shared
 * `usePersistentSettings` hook. Preserves the legacy `(storageKey, defaults)`
 * call signature so per-feature settings wrappers can adopt it with only an
 * import rename.
 */
export function useAsyncStorageSettings<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
): UsePersistentSettingsReturn<T> {
  return usePersistentSettings<T>({
    storageKey,
    defaults,
    storage: asyncStorageAdapter,
  });
}
