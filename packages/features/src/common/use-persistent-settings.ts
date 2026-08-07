"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PersistentStorage } from "./persistent-storage";
import { useLatestRef } from "./use-latest-ref";

export type UsePersistentSettingsOptions<T extends Record<string, unknown>> = {
  storageKey: string;
  defaults: T;
  storage: PersistentStorage;
};

export type UsePersistentSettingsReturn<T extends Record<string, unknown>> = {
  settings: T;
  updateSettings: (partial: Partial<T>) => void;
  resetSettings: () => void;
  isLoaded: boolean;
};

/**
 * Cross-platform settings hook backed by an injected `PersistentStorage`
 * adapter. Apps pass a `localStorage`-backed adapter on web and an
 * `AsyncStorage`-backed adapter on mobile.
 *
 * Semantics:
 * - Starts with `settings = defaults`, `isLoaded = false`.
 * - On mount, reads the stored JSON and merges into defaults:
 *   `{ ...defaults, ...parsed }`. This keeps unknown-to-the-store fields
 *   (added after the user last saved) populated from the defaults.
 * - `updateSettings` optimistically updates state and writes the resulting
 *   object to storage. Storage-write failures are swallowed — the state
 *   stays updated so the UI doesn't freeze on quota / async errors.
 * - `resetSettings` writes `defaults` to storage and resets state.
 *
 * `storage.get` and `storage.set` may be sync or async; both are awaited.
 */
export function usePersistentSettings<T extends Record<string, unknown>>({
  storageKey,
  defaults,
  storage,
}: UsePersistentSettingsOptions<T>): UsePersistentSettingsReturn<T> {
  const [settings, setSettings] = useState<T>(defaults);
  const [isLoaded, setIsLoaded] = useState(false);

  // Defaults are captured by reference into resetSettings; keep the ref stable
  // across renders so callers don't need to memoise the defaults object. The
  // ref is also used by the load effect below to seed the merge without
  // re-running when the defaults identity changes.
  const defaultsRef = useLatestRef(defaults);

  const storageRef = useLatestRef(storage);

  // Event-time mirror of `settings`, written synchronously wherever state is
  // set. It exists so `updateSettings` can compute the merged object OUTSIDE
  // the `setSettings` updater: React updaters must be pure (StrictMode and
  // interrupted renders may invoke them twice), so the storage write that
  // used to live inside the updater could fire twice per update. A
  // `useLatestRef` (commit-time write) would not do here — two
  // `updateSettings` calls in the same tick must see each other's result.
  const settingsRef = useRef(settings);

  const applySettings = useCallback(
    (next: T, { persist }: { persist: boolean }) => {
      settingsRef.current = next;
      setSettings(next);
      if (persist) {
        void Promise.resolve(
          storageRef.current.set(storageKey, JSON.stringify(next)),
        ).catch(() => {
          // Swallow persistence errors; state is still updated so the UI
          // can proceed.
        });
      }
    },
    [storageKey],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await storageRef.current.get(storageKey);
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<T>;
            applySettings(
              { ...defaultsRef.current, ...parsed },
              { persist: false },
            );
          } catch {
            // Invalid JSON — keep defaults.
          }
        }
      } catch {
        // Read failed — keep defaults.
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, applySettings]);

  const updateSettings = useCallback(
    (partial: Partial<T>) => {
      applySettings({ ...settingsRef.current, ...partial }, { persist: true });
    },
    [applySettings],
  );

  const resetSettings = useCallback(() => {
    applySettings(defaultsRef.current, { persist: true });
  }, [applySettings]);

  return { settings, updateSettings, resetSettings, isLoaded };
}
