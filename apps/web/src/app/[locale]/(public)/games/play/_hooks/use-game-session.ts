import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { countPlayerMoves } from '../_lib/fen-utils';
import { mapGameStatusToOutcome } from '../_lib/map-game-status-to-outcome';
import { useAiMoveAnnouncer } from './use-ai-move-announcer';
import { useAiMoveOrchestration } from './use-ai-move-orchestration';
import { useAiVersus } from './use-ai-versus';
import { useAutoSave } from './use-auto-save';
import { parseUrlSearchParams, useGameInitialization } from './use-game-initialization';
import { useGamePersistence } from './use-game-persistence';
import { useGameState } from './use-game-state';
import { useMoveOperationTracker } from './use-move-operation-tracker';
import { useNotation } from './use-notation';
import { usePlayerMove } from './use-player-move';
import { useUrlSync } from './use-url-sync';

type UseGameSessionOptions = {
  locale: Locale;
  onAiMoveChange?: (move: string | null) => void;
};

export function useGameSession({ locale, onAiMoveChange }: UseGameSessionOptions) {
  const t = useTranslations('play');
  const searchParamsFromHook = useSearchParams();

  // Parse URL parameters
  const urlParams = parseUrlSearchParams(searchParamsFromHook);
  const {
    playerSide,
    initialSkillLevel,
    initialGameId,
    initialStartingFen,
    initialMovesFromUrl,
    initialGamePrefs,
    shouldRedirectToError,
    errorDetails,
  } = useGameInitialization(urlParams);

  // Skill level is immutable during gameplay — set at game start, never changed mid-game.
  const [skillLevel] = useState<SkillLevel>(initialSkillLevel);

  // Per-game preferences (from URL params for new games, loaded from saved game for resumed games)
  const [perGamePrefs, setPerGamePrefs] = useState<PerGamePreferences | undefined>(
    initialGamePrefs
  );

  // Track starting FEN - can be from URL or loaded from saved game
  const [startingFen, setStartingFen] = useState<string | undefined>(initialStartingFen);

  // Move input state (managed here to avoid circular deps between usePlayerMove and useAiMoveOrchestration)
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Preserved copy of the exact string the user last tried to submit.
  // Populated on invalid-move failure so the status slot can show
  // "⚠ Invalid move: {lastAttemptedInput}". Cleared alongside error.
  const [lastAttemptedInput, setLastAttemptedInput] = useState('');

  // Notation hook
  const {
    moves,
    pushMove,
    removeMoves,
    setMovesTo,
    fen: currentFen,
    formattedPgn,
  } = useNotation({
    initialMoves: initialMovesFromUrl,
    startingFen,
  });
  const { getAiMove } = useAiVersus(skillLevel);

  // Game persistence hook
  const { isLoadingFromStorage, savedGameStatus, loadedGameData, gameNotFound } =
    useGamePersistence({
      initialGameId,
      initialStartingFen,
    });

  // Operation tracker hook — declared before useGameState so setLogsTo can be
  // passed to useGameState for synchronized restoration alongside moves.
  const {
    logs: operationLogs,
    recordPeek,
    recordUndo,
    recordMovePeek,
    commitMove,
    handleUndoLog,
    truncateLogs,
    setLogsTo,
  } = useMoveOperationTracker();

  // Game state hook
  const {
    gameStatus,
    setGameStatus,
    playerResult,
    setPlayerResult,
    isPlayerTurn,
    lastMove,
    setLastMove,
    shouldMakeAiMove,
    setShouldMakeAiMove,
  } = useGameState({
    playerSide,
    startingFen,
    moves,
    initialMovesFromUrl,
    initialGameId,
    isLoadingFromStorage,
    savedGameStatus,
    loadedGameData,
    setMovesTo,
    setStartingFen,
    setOperationLogsTo: setLogsTo,
  });

  // Restore per-game preferences from loaded game data (game resume).
  // Note: operationLogs restoration is handled in useGameState's effect alongside moves
  // to prevent a race condition where auto-save could overwrite logs with stale data.
  useEffect(() => {
    if (loadedGameData?.gamePreferences) {
      setPerGamePrefs(loadedGameData.gamePreferences);
    }
  }, [loadedGameData]);

  // Map board status to game outcome for repository

  // Auto-save hook
  const { markPlayerInteraction, gameId } = useAutoSave({
    gameId: initialGameId,
    moves,
    playerColor: playerSide,
    skillLevel,
    status: mapGameStatusToOutcome(gameStatus, playerResult),
    startingFen,
    gamePreferences: perGamePrefs,
    operationLogs,
    enabled: !isLoadingFromStorage && !shouldRedirectToError && !gameNotFound,
    saveOnInit: !initialGameId && !shouldRedirectToError,
  });

  // URL sync hook
  const { router } = useUrlSync({
    locale,
    gameId,
    initialGameId,
    playerSide,
    skillLevel,
    initialStartingFen,
    shouldRedirectToError,
    errorDetails,
  });

  // Keep moves in a ref for callbacks that don't need to re-create on every move change
  const movesRef = useRef(moves);
  movesRef.current = moves;

  // Internal helper to reduce duplicated state updates
  const updateLastMove = useCallback(
    (newMoves: AlgebraicNotation[]) => {
      setLastMove(getLastMoveDetails(newMoves as string[], startingFen));
    },
    [startingFen, setLastMove]
  );

  // AI move orchestration
  const handleAiMoveSuccess = useCallback(
    (move: AlgebraicNotation) => {
      pushMove(move);
      const newMoves = [...movesRef.current, move];
      updateLastMove(newMoves);
    },
    [pushMove, updateLastMove]
  );

  const handleAiMoveError = useCallback(() => {
    setError('AI move failed');
    setLastAttemptedInput('');
    setShouldMakeAiMove(false);
  }, [setShouldMakeAiMove]);

  const { isLoading } = useAiMoveOrchestration({
    shouldMakeAiMove: shouldMakeAiMove && !gameNotFound,
    gameStatus,
    moves,
    playerSide,
    startingFen,
    getAiMove,
    onAiMoveSuccess: handleAiMoveSuccess,
    onAiMoveError: handleAiMoveError,
  });

  // Player move hook
  const { handleSubmitMove } = usePlayerMove({
    moves,
    startingFen,
    isLoading,
    isPlayerTurn,
    pushMove,
    markPlayerInteraction,
    setLastMove,
    setMoveInput,
    setError,
    setLastAttemptedInput,
  });

  // Resign handler
  const handleResign = useCallback(() => {
    markPlayerInteraction();
    setGameStatus('checkmate');
    setPlayerResult('loss');
  }, [markPlayerInteraction, setGameStatus, setPlayerResult]);

  // Undo handler
  const handleUndo = useCallback(() => {
    markPlayerInteraction();
    removeMoves(2);
    setError(null);
    setLastAttemptedInput('');
    const newMoves = moves.slice(0, -2) as AlgebraicNotation[];
    updateLastMove(newMoves);
    // handleUndoLog removes the last player's log entry and resets peek/undo counters.
    // Any peeks accumulated before this undo are intentionally discarded (the move "never happened").
    // recordUndo then tracks this undo event on the *next* move's log entry.
    handleUndoLog();
    recordUndo();
  }, [markPlayerInteraction, removeMoves, moves, updateLastMove, handleUndoLog, recordUndo]);

  // Restart from position handler
  const handleRestartFromPosition = useCallback(
    (position: number) => {
      markPlayerInteraction();
      setError(null);
      setLastAttemptedInput('');
      const movesToRemove = moves.length - position - 1;
      if (movesToRemove > 0) {
        removeMoves(movesToRemove);
      }
      const newMoves = moves.slice(0, position + 1) as AlgebraicNotation[];
      updateLastMove(newMoves);

      // Truncate operation logs to match the number of player moves remaining.
      truncateLogs(countPlayerMoves(position, playerSide, startingFen));
    },
    [
      markPlayerInteraction,
      moves,
      removeMoves,
      updateLastMove,
      playerSide,
      startingFen,
      truncateLogs,
    ]
  );

  // Handle new game from position
  const handleNewGameFromPosition = useCallback(
    (position: number) => {
      const movesToKeep = moves.slice(0, position + 1);
      const params = new URLSearchParams();
      params.set('moves', JSON.stringify(movesToKeep));
      params.set('color', playerSide);
      params.set('skillLevel', skillLevel.toString());

      if (startingFen) {
        params.set('fen', startingFen);
      }

      router.push(`/${locale}/games/new/pgn?${params.toString()}`);
    },
    [moves, playerSide, skillLevel, locale, router, startingFen]
  );

  // Current FEN and formatted PGN are memoized values from useNotation

  // Update parent component with AI's last move
  useAiMoveAnnouncer({
    moves,
    playerSide,
    startingFen,
    t,
    onAiMoveChange,
  });

  return {
    gameConfig: {
      playerSide,
      skillLevel,
      initialGameId,
      startingFen,
      locale,
      perGamePrefs,
      gameId,
    },
    gameState: {
      gameStatus,
      playerResult,
      isPlayerTurn,
      isLoading,
      isLoadingFromStorage,
      lastMove,
      gameNotFound,
    },
    moveState: {
      moves,
      currentFen,
      formattedPgn,
    },
    moveInput: {
      value: moveInput,
      setValue: setMoveInput,
      error,
      setError,
      lastAttemptedInput,
      setLastAttemptedInput,
    },
    actions: {
      handleSubmitMove,
      handleResign,
      handleUndo,
      handleRestartFromPosition,
      handleNewGameFromPosition,
      commitMoveLog: commitMove,
      recordPeek,
      recordMovePeek,
    },
    operationLogs,
  };
}
