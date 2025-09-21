import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { LocalStorageGameRepository, GameStatus } from '../_lib/game-repository';
import type { AlgebraicNotation, Side, SkillLevel } from '../_lib/types';

interface UseAutoSaveOptions {
  gameId?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: GameStatus;
  enabled?: boolean;
}

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
}: UseAutoSaveOptions) {
  const gameRepository = new LocalStorageGameRepository();
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

  // Update refs with current values
  useEffect(() => {
    if (gameId && gameId !== gameIdRef.current) {
      gameIdRef.current = gameId;
    }
    currentMovesRef.current = moves;
    currentStatusRef.current = status;
  }, [gameId, moves, status]);

  // Save game function
  const saveGame = useCallback(
    async (showNotification = false) => {
      if (!enabled) return;

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
        sessionStorage.setItem('blindfold_chess_game_updated', Date.now().toString());

        // Show notification if requested
        if (showNotification) {
          sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
        }

        return savedGameId;
      } catch (error) {
        console.error('Failed to auto-save game:', error);
      }
    },
    [enabled, gameRepository, moves, playerColor, skillLevel, status]
  );

  // Auto-save on moves change or status change
  useEffect(() => {
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
  }, [moves.length, status, saveGame]);

  // Auto-save on page visibility change and show notification when navigating away
  useEffect(() => {
    const isGameFinished =
      currentStatusRef.current === 'win' ||
      currentStatusRef.current === 'loss' ||
      currentStatusRef.current === 'draw';

    const handleVisibilityChange = () => {
      if (document.hidden && currentMovesRef.current.length > 0 && !isGameFinished) {
        // Set flag to indicate game was saved
        if (hasSavedInSession.current || hasPendingChanges.current) {
          sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
        }

        // Save if there are pending changes
        if (hasPendingChanges.current) {
          saveGame(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save with notification when component unmounts (navigating to different page)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Show notification when navigating away if we've saved in this session
      if (currentMovesRef.current.length > 0 && !isGameFinished) {
        if (hasSavedInSession.current || hasPendingChanges.current) {
          sessionStorage.setItem('blindfold_chess_show_save_toast', 'true');
        }

        // Save if there are pending changes
        if (hasPendingChanges.current) {
          saveGame(false);
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
