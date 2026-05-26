'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { foldPreferences } from '@/lib/games/fold-preferences';
import type { PreferenceChangeLogEntry } from '@/lib/games/saved-game-types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Structural shape this hook needs from `useGamePersistence`'s
 * `loadedGameData`. Defining it here (instead of importing the full
 * `SavedGameData` type) keeps the hook decoupled from the persistence
 * layer's exact shape — both the resume path (full saved game) and
 * future synthetic resume sources (e.g. share-link replay) need only
 * supply these two preference-related fields.
 */
type LoadedPreferenceData = {
  gamePreferences?: PerGamePreferences;
  preferenceChangeLog?: PreferenceChangeLogEntry[];
};

/**
 * Encapsulates the per-game preference state that the play surface needs to
 * keep coherent across three concerns: the immutable snapshot taken at game
 * start, the append-only timeline of mid-game edits, and the derived
 * "effective right now" view that the renderer consumes.
 *
 * Why this lives in its own hook:
 *
 *  - The three pieces of state move together. Forgetting to fold the change
 *    log on top of the initial snapshot silently shows stale preferences in
 *    the UI; forgetting to seed the snapshot from `loadedGameData` on resume
 *    silently shows the *new-game default* on a resumed game. Co-locating
 *    them stops `useGameSession` from leaking that internal coupling.
 *
 *  - The restoration effect (resume path) and the append-on-edit callback
 *    each touch two of the three pieces. Spreading them across the
 *    orchestrator made it easy to add an effect that re-set one piece
 *    without the other and create a race with auto-save.
 *
 *  - `appendPreferenceChange` returns a boolean so the caller can decide
 *    whether to mark a "pending change" (for `useAutoSave`'s save trigger).
 *    The hook stays unaware of save-side machinery; the orchestrator wires
 *    the two together with one `if (appended) markPendingChange()` call.
 */
export function usePreferenceState({
  initialGamePrefs,
  loadedGameData,
}: {
  initialGamePrefs: PerGamePreferences | undefined;
  loadedGameData: LoadedPreferenceData | null | undefined;
}) {
  // Initial per-game preferences snapshot. Captured at game start (from the
  // new-game form via URL params) or restored from a saved game's snapshot.
  // Immutable for the life of the session — mid-game edits do NOT mutate this
  // value; they accumulate in `preferenceChangeLog` and are folded on top
  // (see `currentPerGamePrefs`).
  const [initialPerGamePrefs, setInitialPerGamePrefs] = useState<PerGamePreferences | undefined>(
    initialGamePrefs
  );

  // Append-only timeline of mid-game preference edits. Persisted as
  // `Game.preferenceChangeLog` alongside the initial snapshot. Each entry
  // anchors to `moves.length` at the time of the change so the timeline
  // survives an undo (we keep historical edits even if they pertain to a
  // half-move that was later undone — a conservative audit choice).
  const [preferenceChangeLog, setPreferenceChangeLog] = useState<PreferenceChangeLogEntry[]>([]);

  // Live, effective per-game preferences = initial + fold(log). Used by the
  // board renderer (via PlayClient's `preferences` merge) and the in-game
  // settings UI's current-value displays.
  const currentPerGamePrefs = useMemo<PerGamePreferences | undefined>(
    () =>
      initialPerGamePrefs ? foldPreferences(initialPerGamePrefs, preferenceChangeLog) : undefined,
    [initialPerGamePrefs, preferenceChangeLog]
  );

  // Restore per-game preferences AND change log from loaded game data
  // (game resume). Both are restored in the same effect so the auto-save
  // mutex never sees one without the other.
  // Note: operationLogs restoration is handled in useGameState's effect
  // alongside moves to prevent a race condition where auto-save could
  // overwrite logs with stale data.
  useEffect(() => {
    if (loadedGameData?.gamePreferences) {
      setInitialPerGamePrefs(loadedGameData.gamePreferences);
    }
    if (loadedGameData?.preferenceChangeLog) {
      setPreferenceChangeLog(loadedGameData.preferenceChangeLog);
    }
  }, [loadedGameData]);

  // Mirror the live change log into a ref so `appendPreferenceChange` can
  // read the latest snapshot without taking `preferenceChangeLog` as a
  // dependency — that would rebuild the callback on every edit and churn
  // child memoization.
  const preferenceChangeLogRef = useRef(preferenceChangeLog);
  preferenceChangeLogRef.current = preferenceChangeLog;

  /**
   * Append one entry to `preferenceChangeLog` for a mid-game preference
   * edit if (and only if) the requested value differs from the current
   * effective value. Toggling a setting back to its existing value is a
   * no-op and returns `false`.
   *
   * Type-safe via a generic K — `from`/`to` must both be of the value
   * type for `key`. Pre-Phase-1 games that lack an `initialPerGamePrefs`
   * snapshot cannot be edited (no base to layer on); the call is a no-op
   * in that case and the Phase 2b UI gates the entry point accordingly.
   *
   * @param atMoveIndex `moves.length` at the time of the change.
   * @returns `true` when an entry was appended (caller should mark a
   *   pending change for auto-save), `false` when the call was a no-op.
   */
  const appendPreferenceChange = useCallback(
    <K extends keyof PerGamePreferences>(
      key: K,
      value: PerGamePreferences[K],
      atMoveIndex: number
    ): boolean => {
      if (!initialPerGamePrefs) return false;
      const currentSnapshot = foldPreferences(initialPerGamePrefs, preferenceChangeLogRef.current);
      if (currentSnapshot[key] === value) return false;
      // Cast safety: each `key` of PerGamePreferences corresponds to exactly
      // one discriminated variant of PreferenceChangeLogEntry, and `from`/`to`
      // here are both typed as PerGamePreferences[K] which matches that
      // variant's from/to shape by construction.
      const entry = {
        atMoveIndex,
        key,
        from: currentSnapshot[key],
        to: value,
      } as PreferenceChangeLogEntry;
      setPreferenceChangeLog((prev) => [...prev, entry]);
      return true;
    },
    [initialPerGamePrefs]
  );

  return {
    initialPerGamePrefs,
    preferenceChangeLog,
    currentPerGamePrefs,
    appendPreferenceChange,
  };
}
