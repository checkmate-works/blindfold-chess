import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { notifyGameListUpdated } from '@/config';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';
import { GameLimitError } from '@/lib/errors';
import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import type {
  GameOutcome,
  MoveOperationLog,
  PreferenceChangeLogEntry,
} from '@/lib/games/saved-game-types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { isViewingFinishedGame } from '../_lib/auto-save-policy';
import { persistGameSnapshot } from '../_lib/persist-game-snapshot';
import { SESSION_STORAGE_KEYS } from '../_lib/session-storage-keys';
import { useAutoSaveEvents } from './use-auto-save-events';
import { useInitialSave } from './use-initial-save';
import { useLatestRefs } from './use-latest-refs';
import { useSaveTrigger } from './use-save-trigger';

/**
 * Refs that track the latest game data values for use in async callbacks.
 */
export type GameDataRefs = {
  moves: React.RefObject<AlgebraicNotation[]>;
  status: React.RefObject<GameOutcome>;
  playerColor: React.RefObject<Side>;
  engineConfig: React.RefObject<EngineConfig>;
  startingFen: React.RefObject<string | undefined>;
  /**
   * Initial per-game preferences snapshot. Immutable for the life of the
   * game once captured at game start — see {@link Game.gamePreferences}.
   * Mid-game edits do NOT mutate this ref; they accumulate in
   * `preferenceChangeLog` and are folded on top at render time.
   */
  gamePreferences: React.RefObject<PerGamePreferences | undefined>;
  preferenceChangeLog: React.RefObject<PreferenceChangeLogEntry[] | undefined>;
  operationLogs: React.RefObject<MoveOperationLog[] | undefined>;
};

/** Options accepted by the {@link useAutoSave} save function. */
export type SaveGameOptions = {
  /**
   * Persist the game without touching React state (`isSaving` /
   * `lastSavedAt` / `gameId`).
   *
   * The `beforeunload` handler can fire synchronously inside a React render
   * during a cross-root-layout (hard) navigation — e.g. leaving `/[locale]/…`
   * for `/`. A normal `setState` there triggers React's "Cannot update a
   * component while rendering a different component" warning, and the save
   * status UI is moot anyway because the page is unloading. Silent saves
   * still persist to storage and run the side effects that matter on the way
   * out (`notifyGameListUpdated`, the toast flag).
   */
  silent?: boolean;
};

/** Signature of the save function returned/threaded through `useAutoSave`. */
export type SaveGame = (
  showNotification?: boolean,
  options?: SaveGameOptions
) => Promise<string | undefined>;

type UseAutoSaveOptions = {
  gameId?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  engineConfig: EngineConfig;
  status: GameOutcome;
  startingFen?: string;
  gamePreferences?: PerGamePreferences;
  preferenceChangeLog?: PreferenceChangeLogEntry[];
  operationLogs?: MoveOperationLog[];
  enabled?: boolean;
  saveOnInit?: boolean;
  /**
   * Repository to persist games to. Injected so tests (and alternate callers)
   * can substitute their own implementation. Defaults to a lazily-constructed
   * `LocalStorageGameRepository`.
   */
  repository?: LocalStorageGameRepository;
};

/**
 * Hook for automatic game saving with session tracking.
 *
 * This is the orchestrator: it owns the persistence callback and the shared
 * save-state refs, and wires together the focused units —
 * - `useLatestRefs` mirrors the live game data into refs for async reads,
 * - `useInitialSave` performs the one-shot save for brand-new games,
 * - `useSaveTrigger` decides when a moves/status change warrants a save,
 * - `useAutoSaveEvents` saves on visibility/unload/navigation events.
 */
export function useAutoSave({
  gameId,
  moves,
  playerColor,
  engineConfig,
  status,
  startingFen,
  gamePreferences,
  preferenceChangeLog,
  operationLogs,
  enabled = true,
  saveOnInit = false,
  repository,
}: UseAutoSaveOptions) {
  // If the caller injected a repository, use it as-is; otherwise lazily build
  // a default LocalStorageGameRepository once per hook instance.
  const defaultRepository = useMemo(() => new LocalStorageGameRepository(), []);
  const gameRepository = repository ?? defaultRepository;

  const [currentGameId, setCurrentGameId] = useState<string | undefined>(gameId);
  const currentGameIdRef = useRef<string | undefined>(gameId);

  // Game data refs — track the latest values for use in async callbacks.
  const gameDataRefs: GameDataRefs = useLatestRefs({
    moves,
    status,
    playerColor,
    engineConfig,
    startingFen,
    gamePreferences,
    preferenceChangeLog,
    operationLogs,
  });

  // Mirror the save-gating props so async callbacks read the latest values.
  const { saveOnInit: saveOnInitRef, enabled: enabledRef } = useLatestRefs({
    saveOnInit,
    enabled,
  });

  // Save state refs — track save progress and session state.
  const lastSavedMovesLength = useRef(moves.length);
  const lastSavedStatus = useRef(status);
  const hasPlayerInteracted = useRef(false);
  const hasPendingChanges = useRef(false);
  const hasSavedInSession = useRef(false);
  const isSavingRef = useRef(false);
  const isInitialSyncSave = useRef(false);

  // State for save status indicator.
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Adopt a new `gameId` if the prop changes (e.g. a fresh game id arrives
  // while this hook instance stays mounted).
  useEffect(() => {
    if (gameId && gameId !== currentGameId) {
      setCurrentGameId(gameId);
      currentGameIdRef.current = gameId;
    }
  }, [gameId, currentGameId]);

  // Initial save for new games
  const { hasInitialSaveExecuted } = useInitialSave({
    saveOnInit,
    enabled,
    currentGameId,
    gameRepository,
    gameDataRefs,
    saveStateRefs: { lastSavedMovesLength, lastSavedStatus, hasSavedInSession },
    setCurrentGameId,
    currentGameIdRef,
  });

  // Save game function
  const saveGame = useCallback(
    async (showNotification = false, options?: SaveGameOptions) => {
      // Silent saves persist without React state updates — see SaveGameOptions.
      const silent = options?.silent ?? false;

      if (!enabledRef.current) return;

      // Mutex: skip if another save is already in progress
      if (isSavingRef.current) return;

      // Skip if initial save is pending for a new game
      if (saveOnInitRef.current && !currentGameIdRef.current && !hasInitialSaveExecuted.current) {
        return;
      }

      // Don't save if the game is already finished and we're just viewing it
      const currentStatus = gameDataRefs.status.current;
      if (isViewingFinishedGame(currentStatus, lastSavedStatus.current)) {
        return;
      }

      isSavingRef.current = true;
      if (!silent) setIsSaving(true);

      try {
        const currentMoves = gameDataRefs.moves.current;
        const gameData = {
          moves: currentMoves,
          playerColor: gameDataRefs.playerColor.current,
          engineConfig: gameDataRefs.engineConfig.current,
          status: currentStatus,
          startingFen: gameDataRefs.startingFen.current,
          gamePreferences: gameDataRefs.gamePreferences.current,
          preferenceChangeLog: gameDataRefs.preferenceChangeLog.current,
          operationLogs: gameDataRefs.operationLogs.current,
        };

        const gameIdFromRef = currentGameIdRef.current;
        const savedGameId = await persistGameSnapshot(gameRepository, gameData, {
          gameId: gameIdFromRef,
          // Skip lastPlayed update during initial sync save (reopening a game without making a move)
          updateLastPlayed: !isInitialSyncSave.current,
        });

        // If persistGameSnapshot had to create a new record (either because
        // there was no gameId, or the previous id was stale), sync our refs
        // and state to the freshly minted id.
        if (savedGameId !== gameIdFromRef) {
          currentGameIdRef.current = savedGameId;
          if (!silent) setCurrentGameId(savedGameId);
        }

        lastSavedMovesLength.current = currentMoves.length;
        lastSavedStatus.current = currentStatus;
        hasPendingChanges.current = false;
        if (isInitialSyncSave.current) {
          isInitialSyncSave.current = false;
        } else {
          hasSavedInSession.current = true;
        }

        // Update save status
        if (!silent) {
          setLastSavedAt(new Date());
          setIsSaving(false);
        }

        notifyGameListUpdated();

        // Show notification if requested
        if (showNotification) {
          sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
        }

        return savedGameId;
      } catch (error) {
        if (!silent) setIsSaving(false);
        if (error instanceof GameLimitError) {
          console.warn('Game limit reached, cannot save game:', error);
        } else {
          console.error('Failed to auto-save game:', error);
        }
      } finally {
        isSavingRef.current = false;
      }
    },
    [gameRepository] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Auto-save when moves or status change (owns the enabled state machine)
  useSaveTrigger({
    moves,
    status,
    enabled,
    currentGameId,
    saveOnInitRef,
    hasInitialSaveExecuted,
    hasPlayerInteracted,
    hasPendingChanges,
    isInitialSyncSave,
    lastSavedMovesLength,
    lastSavedStatus,
    saveGame,
  });

  // Event listener management (visibilitychange, beforeunload, pathname change)
  useAutoSaveEvents({
    saveGame,
    currentMovesRef: gameDataRefs.moves,
    currentStatusRef: gameDataRefs.status as React.RefObject<string>,
    hasPlayerInteracted,
    hasPendingChanges,
    hasSavedInSession,
  });

  // Manual save function
  const manualSave = useCallback(() => {
    return saveGame(true);
  }, [saveGame]);

  // Mark player interaction
  const markPlayerInteraction = useCallback(() => {
    hasPlayerInteracted.current = true;
  }, []);

  return {
    saveGame: manualSave,
    markPlayerInteraction,
    gameId: currentGameId,
    isSaving,
    lastSavedAt,
  };
}
