import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { notifyGameListUpdated } from '@/config';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';
import { GameLimitError } from '@/lib/errors';
import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import type { GameOutcome, MoveOperationLog } from '@/lib/types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { isGameFinished } from '../_lib/game-utils';
import { persistGameSnapshot } from '../_lib/persist-game-snapshot';
import { SESSION_STORAGE_KEYS } from '../_lib/session-storage-keys';
import { useAutoSaveEvents } from './use-auto-save-events';
import { useInitialSave } from './use-initial-save';

/**
 * Refs that track the latest game data values for use in async callbacks.
 */
export type GameDataRefs = {
  moves: React.RefObject<AlgebraicNotation[]>;
  status: React.RefObject<GameOutcome>;
  playerColor: React.RefObject<Side>;
  engineConfig: React.RefObject<EngineConfig>;
  startingFen: React.RefObject<string | undefined>;
  gamePreferences: React.RefObject<PerGamePreferences | undefined>;
  operationLogs: React.RefObject<MoveOperationLog[] | undefined>;
};

type UseAutoSaveOptions = {
  gameId?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  engineConfig: EngineConfig;
  status: GameOutcome;
  startingFen?: string;
  gamePreferences?: PerGamePreferences;
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
 * Hook for automatic game saving with session tracking
 */
export function useAutoSave({
  gameId,
  moves,
  playerColor,
  engineConfig,
  status,
  startingFen,
  gamePreferences,
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

  // Game data refs — track the latest values for use in async callbacks
  const gameDataRefs: GameDataRefs = {
    moves: useRef(moves),
    status: useRef(status),
    playerColor: useRef(playerColor),
    engineConfig: useRef(engineConfig),
    startingFen: useRef(startingFen),
    gamePreferences: useRef(gamePreferences),
    operationLogs: useRef(operationLogs),
  };

  // Save state refs — track save progress and session state
  const lastSavedMovesLength = useRef(moves.length);
  const lastSavedStatus = useRef(status);
  const hasPlayerInteracted = useRef(false);
  const hasPendingChanges = useRef(false);
  const hasSavedInSession = useRef(false);
  const isSavingRef = useRef(false);
  const isInitialSyncSave = useRef(false);
  const saveOnInitRef = useRef(saveOnInit);
  const enabledRef = useRef(enabled);

  // State for save status indicator
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Update current game ID and refs with current values
  useEffect(() => {
    if (gameId && gameId !== currentGameId) {
      setCurrentGameId(gameId);
      currentGameIdRef.current = gameId;
    }
    gameDataRefs.moves.current = moves;
    gameDataRefs.status.current = status;
    gameDataRefs.playerColor.current = playerColor;
    gameDataRefs.engineConfig.current = engineConfig;
    gameDataRefs.startingFen.current = startingFen;
    gameDataRefs.gamePreferences.current = gamePreferences;
    gameDataRefs.operationLogs.current = operationLogs;
    saveOnInitRef.current = saveOnInit;
    enabledRef.current = enabled;
  }, [
    gameId,
    moves,
    status,
    currentGameId,
    playerColor,
    engineConfig,
    startingFen,
    gamePreferences,
    operationLogs,
    saveOnInit,
    enabled,
    gameDataRefs.moves,
    gameDataRefs.status,
    gameDataRefs.playerColor,
    gameDataRefs.engineConfig,
    gameDataRefs.startingFen,
    gameDataRefs.gamePreferences,
    gameDataRefs.operationLogs,
  ]);

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
    async (showNotification = false) => {
      if (!enabledRef.current) return;

      // Mutex: skip if another save is already in progress
      if (isSavingRef.current) return;

      // Skip if initial save is pending for a new game
      if (saveOnInitRef.current && !currentGameIdRef.current && !hasInitialSaveExecuted.current) {
        return;
      }

      // Don't save if the game is already finished and we're just viewing it
      const currentStatus = gameDataRefs.status.current;
      if (isGameFinished(currentStatus) && isGameFinished(lastSavedStatus.current)) {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        const currentMoves = gameDataRefs.moves.current;
        const gameData = {
          moves: currentMoves,
          playerColor: gameDataRefs.playerColor.current,
          engineConfig: gameDataRefs.engineConfig.current,
          status: currentStatus,
          startingFen: gameDataRefs.startingFen.current,
          gamePreferences: gameDataRefs.gamePreferences.current,
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
          setCurrentGameId(savedGameId);
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
        setLastSavedAt(new Date());
        setIsSaving(false);

        notifyGameListUpdated();

        // Show notification if requested
        if (showNotification) {
          sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
        }

        return savedGameId;
      } catch (error) {
        setIsSaving(false);
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

  const prevEnabled = useRef(enabled);

  // Auto-save on moves change or status change
  useEffect(() => {
    // If auto-save is disabled (e.g. while loading), keep the last saved state in sync
    // so that we don't trigger a save immediately when it becomes enabled
    if (!enabled) {
      lastSavedMovesLength.current = moves.length;
      lastSavedStatus.current = status;
      prevEnabled.current = enabled;
      return;
    }

    // If auto-save just became enabled (transition from false -> true),
    // sync the state but don't save yet. This handles the case where data was loaded
    // and enabled became true in the same render cycle.
    if (!prevEnabled.current && enabled) {
      lastSavedMovesLength.current = moves.length;
      lastSavedStatus.current = status;
      prevEnabled.current = enabled;
      // Only set the sync flag if moves haven't been loaded yet (length 0).
      // In production, the enabled transition always fires before moves are
      // set via setMovesTo, so moves.length is 0 at this point.
      // This guard also protects against future refactors that might change
      // the render timing.
      if (moves.length === 0) {
        isInitialSyncSave.current = true;
      }
      return;
    }

    prevEnabled.current = enabled;

    // Skip if initial save is pending for a new game
    if (saveOnInitRef.current && !currentGameId && !hasInitialSaveExecuted.current) {
      return;
    }

    // Auto-save if moves have changed and either:
    // 1. Player has interacted (made a move)
    // 2. We have more moves than initially (game is progressing)
    const hasNewMoves = moves.length !== lastSavedMovesLength.current;
    const hasStatusChanged = status !== lastSavedStatus.current;
    const isGameProgressing = moves.length > 0;
    // Don't save if the game was already finished (prevents updating lastPlayed when viewing finished games)
    if (isGameFinished(lastSavedStatus.current)) {
      return;
    }

    if ((hasNewMoves || hasStatusChanged) && (hasPlayerInteracted.current || isGameProgressing)) {
      // For finished games, only mark that we have pending changes if the status actually changed
      if (!isGameFinished(status) || hasStatusChanged) {
        hasPendingChanges.current = true;
      }
      // Save immediately to ensure both player and AI moves are saved
      saveGame(false); // Don't show notification on auto-save
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasInitialSaveExecuted is a ref (stable identity)
  }, [moves.length, status, saveGame, currentGameId, enabled]);

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
