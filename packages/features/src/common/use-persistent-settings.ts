import { useCallback, useEffect, useRef, useState } from "react";

import type { PersistentStorage } from "./persistent-storage";

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
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const storageRef = useRef(storage);
  storageRef.current = storage;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await storageRef.current.get(storageKey);
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<T>;
            setSettings({ ...defaultsRef.current, ...parsed });
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
  }, [storageKey]);

  const updateSettings = useCallback(
    (partial: Partial<T>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        void Promise.resolve(
          storageRef.current.set(storageKey, JSON.stringify(next)),
        ).catch(() => {
          // Swallow persistence errors; state is still updated so the UI
          // can proceed.
        });
        return next;
      });
    },
    [storageKey],
  );

  const resetSettings = useCallback(() => {
    const fresh = defaultsRef.current;
    setSettings(fresh);
    void Promise.resolve(
      storageRef.current.set(storageKey, JSON.stringify(fresh)),
    ).catch(() => {
      // Swallow; state is reset regardless.
    });
  }, [storageKey]);

  return { settings, updateSettings, resetSettings, isLoaded };
}
