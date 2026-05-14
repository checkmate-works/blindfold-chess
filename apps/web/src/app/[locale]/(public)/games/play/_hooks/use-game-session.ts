import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { type EngineConfig, engineConfigToUrlParams } from '@/lib/engines';

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
};

export function useGameSession({ locale }: UseGameSessionOptions) {
  const t = useTranslations('play');
  const searchParamsFromHook = useSearchParams();

  // Parse URL parameters
  const urlParams = parseUrlSearchParams(searchParamsFromHook);
  const {
    playerSide,
    initialEngineConfig,
    initialGameId,
    initialStartingFen,
    initialMovesFromUrl,
    initialGamePrefs,
    shouldRedirectToError,
    errorDetails,
  } = useGameInitialization(urlParams);

  // Engine + difficulty are immutable during gameplay — captured at game
  // start and never changed mid-game. The discriminated union encodes
  // both pieces together so we can't end up with a Maia engine paired
  // with a Stockfish skill level (or vice versa).
  const [engineConfig] = useState<EngineConfig>(initialEngineConfig);

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
  const { getAiMove, reset: resetAiOpponent } = useAiVersus(engineConfig);

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
    engineConfig,
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
    engineConfig,
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

  // AI-move failure state, kept separate from the generic `error` slot so
  // the UI can distinguish "AI move failed" (surface a Retry button) from
  // the regular "invalid move" path (no Retry — the user just edits their
  // input). `clearMoveError` nulls both in lockstep because any input edit
  // is treated as the user moving on from either error.
  const [aiMoveError, setAiMoveError] = useState<string | null>(null);

  const handleAiMoveError = useCallback(() => {
    const message = t('aiMoveFailed');
    setError(message);
    setAiMoveError(message);
    setLastAttemptedInput('');
    setShouldMakeAiMove(false);
  }, [t, setShouldMakeAiMove]);

  const retryAiMove = useCallback(() => {
    // Clear the error state synchronously so the Retry button unmounts on
    // the first click; a fast double-click during the recreate window would
    // otherwise re-enter this callback (isLoading stays false until the
    // orchestration effect schedules).
    setError(null);
    setAiMoveError(null);
    setLastAttemptedInput('');
    // Tear down the current opponent so the next `getAiMove` call spins up
    // a fresh Worker. `reset` is synchronous: it bumps a counter that
    // re-runs `useAiVersus`'s effect, which destroys the old opponent and
    // constructs a new one before the next render-driven orchestration
    // round can observe it.
    resetAiOpponent();
    setShouldMakeAiMove(true);
  }, [resetAiOpponent, setShouldMakeAiMove]);

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
      for (const [key, value] of Object.entries(engineConfigToUrlParams(engineConfig))) {
        params.set(key, value);
      }

      if (startingFen) {
        params.set('fen', startingFen);
      }

      router.push(`/${locale}/games/new/pgn?${params.toString()}`);
    },
    [moves, playerSide, engineConfig, locale, router, startingFen]
  );

  // Current FEN and formatted PGN are memoized values from useNotation

  // Localized label for the AI's last move (e.g. "AI played 1... e5"), or null
  // when there is nothing to announce. Consumed by the page-level status slot.
  const aiMoveDisplay = useAiMoveAnnouncer({
    moves,
    playerSide,
    startingFen,
    t,
  });

  // Surface the "AI is computing" state so the page-level status slot can show
  // it in place of rendering an inline "AI is thinking…" line, avoiding
  // vertical layout shift on every AI turn.
  const isAiThinking = !isPlayerTurn && isLoading;

  // Clear both the error and the preserved attempted-input in one call.
  // Wired to every child input component's `onErrorClear` so that any user
  // edit reverts the status slot back to "AI played …" / "Play Chess".
  // Also clears any AI-move error so the Retry affordance disappears in
  // lockstep — otherwise an invalid-move edit would leave the Retry button
  // hanging around after the user had moved on.
  const clearMoveError = useCallback(() => {
    setError(null);
    setAiMoveError(null);
    setLastAttemptedInput('');
  }, [setError, setLastAttemptedInput]);

  return {
    gameConfig: {
      playerSide,
      engineConfig,
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
      lastAttemptedInput,
      clearMoveError,
    },
    aiMoveError: {
      message: aiMoveError,
      retry: retryAiMove,
    },
    aiMoveDisplay,
    isAiThinking,
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

export type GameSession = ReturnType<typeof useGameSession>;
