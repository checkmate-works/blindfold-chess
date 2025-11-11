import { useCallback, useEffect, useMemo, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { STORAGE_KEYS } from '@/config';

import { GameLimitError } from '@/lib/errors';
import { LocalStorageGameRepository } from '@/lib/repositories';
import type { GameStatus } from '@/lib/types';
import type { AlgebraicNotation, Side, SkillLevel } from '@/lib/types';

type UseAutoSaveOptions = {
  gameId?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: GameStatus;
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
  enabled = true,
  saveOnInit = false,
}: UseAutoSaveOptions) {
  const gameRepository = useMemo(() => new LocalStorageGameRepository(), []);
  const pathname = usePathname();

  const gameIdRef = useRef<string | undefined>(gameId);
  const lastSavedMovesLength = useRef(moves.length);
  const lastSavedStatus = useRef(status);
  const hasPlayerInteracted = useRef(false);
  const currentMovesRef = useRef(moves);
  const currentStatusRef = useRef(status);
  const hasPendingChanges = useRef(false);
  const hasSavedInSession = useRef(false);
  const previousPathname = useRef(pathname);
  const hasInitialSaveExecuted = useRef(false);

  // Update refs with current values
  useEffect(() => {
    if (gameId && gameId !== gameIdRef.current) {
      gameIdRef.current = gameId;
    }
    currentMovesRef.current = moves;
    currentStatusRef.current = status;
  }, [gameId, moves, status]);

  // Initial save when component mounts if saveOnInit is true
  useEffect(() => {
    if (saveOnInit && enabled && !gameIdRef.current && !hasInitialSaveExecuted.current) {
      // For new games (including PGN imports), save immediately
      // This ensures the game is saved even if player navigates away without making a move
      const performInitialSave = async () => {
        hasInitialSaveExecuted.current = true; // Mark as executed to prevent duplicates

        try {
          const savedGameId = await gameRepository.save(
            {
              moves: currentMovesRef.current,
              playerColor,
              skillLevel,
              status: currentStatusRef.current,
            },
            gameIdRef.current
          );

          // Update game ID if it was newly created
          if (!gameIdRef.current) {
            gameIdRef.current = savedGameId;
          }

          lastSavedMovesLength.current = currentMovesRef.current.length;
          lastSavedStatus.current = currentStatusRef.current;
          hasSavedInSession.current = true;

          // Set session storage flag for cross-component updates
          sessionStorage.setItem(STORAGE_KEYS.GAME_UPDATED, Date.now().toString());
        } catch (error) {
          if (error instanceof GameLimitError) {
            // Game limit reached - log warning but don't block the game
            console.warn('Game limit reached, cannot save game:', error.message);
            // Set session storage flag to show notification later
            sessionStorage.setItem('blindfold_chess_game_limit_reached', 'true');
          } else {
            console.error('Failed to save initial game state:', error);
          }
          hasInitialSaveExecuted.current = false; // Reset flag on error
        }
      };

      performInitialSave();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save game function
  const saveGame = useCallback(
    async (showNotification = false) => {
      if (!enabled) return;

      // Skip if initial save is pending for a new game
      if (saveOnInit && !gameIdRef.current && !hasInitialSaveExecuted.current) {
        return;
      }

      // Don't save if the game is already finished and we're just viewing it
      const isGameFinished = status === 'win' || status === 'loss' || status === 'draw';
      const wasGameFinished =
        lastSavedStatus.current === 'win' ||
        lastSavedStatus.current === 'loss' ||
        lastSavedStatus.current === 'draw';
      if (isGameFinished && wasGameFinished) {
        return;
      }

      try {
        const savedGameId = await gameRepository.save(
          {
            moves,
            playerColor,
            skillLevel,
            status,
          },
          gameIdRef.current
        );

        // Update game ID if it was newly created
        if (!gameIdRef.current) {
          gameIdRef.current = savedGameId;
        }

        lastSavedMovesLength.current = moves.length;
        lastSavedStatus.current = status;
        hasPendingChanges.current = false;
        hasSavedInSession.current = true;

        // Set session storage flag for cross-component updates
        sessionStorage.setItem(STORAGE_KEYS.GAME_UPDATED, Date.now().toString());

        // Show notification if requested
        if (showNotification) {
          sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
        }

        return savedGameId;
      } catch (error) {
        if (error instanceof GameLimitError) {
          // Game limit reached - log warning but don't block the game
          console.warn('Game limit reached, cannot save game:', error.message);
          // Set session storage flag to show notification later
          sessionStorage.setItem('blindfold_chess_game_limit_reached', 'true');
        } else {
          console.error('Failed to auto-save game:', error);
        }
      }
    },
    [enabled, gameRepository, moves, playerColor, skillLevel, status, saveOnInit]
  );

  // Auto-save on moves change or status change
  useEffect(() => {
    // Skip if initial save is pending for a new game
    if (saveOnInit && !gameIdRef.current && !hasInitialSaveExecuted.current) {
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
  }, [moves.length, status, saveGame, saveOnInit]);

  // Auto-save on page visibility change and show notification when navigating away
  useEffect(() => {
    const isGameFinished =
      currentStatusRef.current === 'win' ||
      currentStatusRef.current === 'loss' ||
      currentStatusRef.current === 'draw';

    const handleVisibilityChange = async () => {
      if (document.hidden && currentMovesRef.current.length > 0 && !isGameFinished) {
        // Save if there are pending changes
        if (hasPendingChanges.current) {
          await saveGame(false);
        }

        // Set flag to indicate game was saved (only if no game limit error occurred)
        const hasGameLimitError = sessionStorage.getItem('blindfold_chess_game_limit_reached');
        if (
          (hasSavedInSession.current || hasPendingChanges.current) &&
          hasGameLimitError !== 'true'
        ) {
          sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save with notification when component unmounts (navigating to different page)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Show notification when navigating away if we've saved in this session
      if (currentMovesRef.current.length > 0 && !isGameFinished) {
        // Save if there are pending changes (synchronous during unmount)
        if (hasPendingChanges.current) {
          saveGame(false);
        }

        // Set flag to indicate game was saved (only if no game limit error occurred)
        const hasGameLimitError = sessionStorage.getItem('blindfold_chess_game_limit_reached');
        if (
          (hasSavedInSession.current || hasPendingChanges.current) &&
          hasGameLimitError !== 'true'
        ) {
          sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
        }
      }
    };
  }, [saveGame]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasPlayerInteracted.current && moves.length > 0) {
        // Note: Can't show toast during unload, but save the game
        saveGame(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveGame, moves.length]);

  // Detect pathname changes (navigation)
  useEffect(() => {
    const isGameFinished =
      currentStatusRef.current === 'win' ||
      currentStatusRef.current === 'loss' ||
      currentStatusRef.current === 'draw';

    if (pathname !== previousPathname.current && previousPathname.current) {
      // Navigation is happening
      if (
        currentMovesRef.current.length > 0 &&
        (hasSavedInSession.current || hasPendingChanges.current) &&
        !isGameFinished
      ) {
        sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
      }
    }

    previousPathname.current = pathname;
  }, [pathname]);

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
    gameId: gameIdRef.current,
  };
}
