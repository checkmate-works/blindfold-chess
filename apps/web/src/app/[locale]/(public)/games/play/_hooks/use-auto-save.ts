import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { notifyGameListUpdated } from '@/config';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { GameLimitError } from '@/lib/errors';
import { LocalStorageGameRepository } from '@/lib/repositories';
import type { GameOutcome, MoveOperationLog, SkillLevel } from '@/lib/types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useAutoSaveEvents } from './use-auto-save-events';
import { useInitialSave } from './use-initial-save';

/**
 * Refs that track the latest game data values for use in async callbacks.
 */
export type GameDataRefs = {
  moves: React.RefObject<AlgebraicNotation[]>;
  status: React.RefObject<GameOutcome>;
  playerColor: React.RefObject<Side>;
  skillLevel: React.RefObject<SkillLevel>;
  startingFen: React.RefObject<string | undefined>;
  gamePreferences: React.RefObject<PerGamePreferences | undefined>;
  operationLogs: React.RefObject<MoveOperationLog[] | undefined>;
};

type UseAutoSaveOptions = {
  gameId?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: GameOutcome;
  startingFen?: string;
  gamePreferences?: PerGamePreferences;
  operationLogs?: MoveOperationLog[];
  enabled?: boolean;
  saveOnInit?: boolean;
};

/**
 * Hook for automatic game saving with session tracking
 */
export function useAutoSave({
  gameId,
  moves,
  playerColor,
  skillLevel,
  status,
  startingFen,
  gamePreferences,
  operationLogs,
  enabled = true,
  saveOnInit = false,
}: UseAutoSaveOptions) {
  const gameRepository = useMemo(() => new LocalStorageGameRepository(), []);

  const [currentGameId, setCurrentGameId] = useState<string | undefined>(gameId);
  const currentGameIdRef = useRef<string | undefined>(gameId);

  // Game data refs — track the latest values for use in async callbacks
  const gameDataRefs: GameDataRefs = {
    moves: useRef(moves),
    status: useRef(status),
    playerColor: useRef(playerColor),
    skillLevel: useRef(skillLevel),
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
    gameDataRefs.skillLevel.current = skillLevel;
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
    skillLevel,
    startingFen,
    gamePreferences,
    operationLogs,
    saveOnInit,
    enabled,
    gameDataRefs.moves,
    gameDataRefs.status,
    gameDataRefs.playerColor,
    gameDataRefs.skillLevel,
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
      const isGameFinished =
        currentStatus === 'win' || currentStatus === 'loss' || currentStatus === 'draw';
      const wasGameFinished =
        lastSavedStatus.current === 'win' ||
        lastSavedStatus.current === 'loss' ||
        lastSavedStatus.current === 'draw';
      if (isGameFinished && wasGameFinished) {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);

      try {
        const currentMoves = gameDataRefs.moves.current;
        const gameData = {
          moves: currentMoves,
          playerColor: gameDataRefs.playerColor.current,
          skillLevel: gameDataRefs.skillLevel.current,
          status: currentStatus,
          startingFen: gameDataRefs.startingFen.current,
          gamePreferences: gameDataRefs.gamePreferences.current,
          operationLogs: gameDataRefs.operationLogs.current,
        };

        let savedGameId: string;
        const gameIdFromRef = currentGameIdRef.current;

        if (gameIdFromRef) {
          // Check if game actually exists before updating
          const existingGame = await gameRepository.load(gameIdFromRef);
          if (existingGame) {
            // Update existing game
            // Skip lastPlayed update during initial sync save (reopening a game without making a move)
            await gameRepository.update(gameIdFromRef, gameData, {
              updateLastPlayed: !isInitialSyncSave.current,
            });
            savedGameId = gameIdFromRef;
          } else {
            // Game ID provided but doesn't exist - create new game
            savedGameId = await gameRepository.create(gameData);
            currentGameIdRef.current = savedGameId;
            setCurrentGameId(savedGameId);
          }
        } else {
          // Create new game
          savedGameId = await gameRepository.create(gameData);
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
          sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
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
    const isGameFinished = status === 'win' || status === 'loss' || status === 'draw';
    const wasGameFinished =
      lastSavedStatus.current === 'win' ||
      lastSavedStatus.current === 'loss' ||
      lastSavedStatus.current === 'draw';

    // Don't save if the game was already finished (prevents updating lastPlayed when viewing finished games)
    if (wasGameFinished) {
      return;
    }

    if ((hasNewMoves || hasStatusChanged) && (hasPlayerInteracted.current || isGameProgressing)) {
      // For finished games, only mark that we have pending changes if the status actually changed
      if (!isGameFinished || hasStatusChanged) {
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

  // Update a specific game field immediately and trigger a save
  const updateSkillLevel = useCallback(
    async (newSkillLevel: SkillLevel) => {
      gameDataRefs.skillLevel.current = newSkillLevel;
      return saveGame(false);
    },
    [saveGame] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    saveGame: manualSave,
    markPlayerInteraction,
    updateSkillLevel,
    gameId: currentGameId,
    isSaving,
    lastSavedAt,
  };
}
