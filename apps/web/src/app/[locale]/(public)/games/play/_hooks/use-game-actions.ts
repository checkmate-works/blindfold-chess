import { useCallback } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';

import type { Locale } from '@/app/[locale]/_lib/types';

import { buildNewGameFromPositionUrl } from '../_lib/build-new-game-from-position-url';
import { countPlayerMoves } from '../_lib/fen-utils';

/**
 * The session's game-level action handlers: resign, undo, restart-from-
 * position, and new-game-from-position. Each coordinates the move array,
 * the operation log, and the last-move highlight together, so they live in
 * one hook — kept out of `useGameSession`, which stays a composition layer.
 */
export function useGameActions({
  locale,
  moves,
  playerSide,
  startingFen,
  setupPlies,
  engineConfig,
  markPlayerInteraction,
  setGameStatus,
  setPlayerResult,
  removeMoves,
  updateLastMove,
  clearInputError,
  handleUndoLog,
  recordUndo,
  truncateLogs,
  navigate,
}: {
  locale: Locale;
  moves: AlgebraicNotation[];
  playerSide: 'white' | 'black';
  startingFen: string | undefined;
  /** Seeded setup-prefix length — pre-played moves have no operation log. */
  setupPlies: number | undefined;
  engineConfig: EngineConfig;
  markPlayerInteraction: () => void;
  setGameStatus: (status: 'checkmate') => void;
  setPlayerResult: (result: 'loss') => void;
  removeMoves: (count: number) => void;
  updateLastMove: (newMoves: AlgebraicNotation[]) => void;
  clearInputError: () => void;
  handleUndoLog: () => void;
  recordUndo: () => void;
  truncateLogs: (playerMoveCount: number) => void;
  navigate: (url: string) => void;
}) {
  const handleResign = useCallback(() => {
    markPlayerInteraction();
    setGameStatus('checkmate');
    setPlayerResult('loss');
  }, [markPlayerInteraction, setGameStatus, setPlayerResult]);

  const handleUndo = useCallback(() => {
    markPlayerInteraction();
    removeMoves(2);
    clearInputError();
    const newMoves = moves.slice(0, -2) as AlgebraicNotation[];
    updateLastMove(newMoves);
    // handleUndoLog removes the last player's log entry and resets peek/undo counters.
    // Any peeks accumulated before this undo are intentionally discarded (the move "never happened").
    // recordUndo then tracks this undo event on the *next* move's log entry.
    handleUndoLog();
    recordUndo();
  }, [
    markPlayerInteraction,
    removeMoves,
    clearInputError,
    moves,
    updateLastMove,
    handleUndoLog,
    recordUndo,
  ]);

  const handleRestartFromPosition = useCallback(
    (position: number) => {
      markPlayerInteraction();
      clearInputError();
      const movesToRemove = moves.length - position - 1;
      if (movesToRemove > 0) {
        removeMoves(movesToRemove);
      }
      const newMoves = moves.slice(0, position + 1) as AlgebraicNotation[];
      updateLastMove(newMoves);

      // Truncate operation logs to match the number of player moves remaining.
      // Seeded setup moves have no log entry, so they are excluded from the count.
      truncateLogs(countPlayerMoves(position, playerSide, startingFen, setupPlies ?? 0));
    },
    [
      markPlayerInteraction,
      clearInputError,
      moves,
      removeMoves,
      updateLastMove,
      playerSide,
      startingFen,
      setupPlies,
      truncateLogs,
    ]
  );

  const handleNewGameFromPosition = useCallback(
    (position: number) => {
      navigate(
        buildNewGameFromPositionUrl({
          locale,
          moves,
          position,
          playerSide,
          engineConfig,
          startingFen,
        })
      );
    },
    [navigate, moves, playerSide, engineConfig, locale, startingFen]
  );

  return { handleResign, handleUndo, handleRestartFromPosition, handleNewGameFromPosition };
}
