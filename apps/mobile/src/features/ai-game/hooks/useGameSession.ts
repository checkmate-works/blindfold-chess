import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Result } from "@blindfold-chess/features/utils";
import type { EngineError } from "../engine";
import * as Haptics from "expo-haptics";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";
import {
  computeGameState,
  validateGameMove,
} from "@blindfold-chess/features/ai-game";

import type { GameStatus, PlayerResult, SkillLevel } from "../lib/types";

/**
 * What went wrong with the last thing the session tried, as a kind the
 * screen translates. The two call for different controls: an invalid move is
 * fixed by entering another one, a failed AI move by the Retry button.
 */
export type GameSessionError =
  { kind: "invalid-move"; input: string } | { kind: "ai-move-failed" };

type UseGameSessionProps = {
  playerColor: Side;
  skillLevel: SkillLevel;
  getAiMove: (
    moves: AlgebraicNotation[],
    startingFen?: string,
  ) => Promise<Result<AlgebraicNotation, EngineError>>;
  isAiLoading: boolean;
  /**
   * Restarts the engine before a retried AI move. A failure may have left the
   * engine unusable, so Retry does not ask the same instance again.
   */
  resetAi?: () => void;
  /** Position the game starts from; the standard position when absent. */
  startingFen?: string;
  /**
   * Moves already played from `startingFen` (a pasted PGN's mainline). They
   * are the first entries of `moves`, so the history shows them and the engine
   * sees the whole game. Read once on mount, like any initial state.
   */
  initialMoves?: AlgebraicNotation[];
};

/** A move and the reply to it: what one undo takes back. */
const UNDO_PLIES = 2;

export function useGameSession({
  playerColor,
  skillLevel,
  getAiMove,
  isAiLoading,
  resetAi,
  startingFen,
  initialMoves,
}: UseGameSessionProps) {
  const [moves, setMoves] = useState<AlgebraicNotation[]>(
    () => initialMoves ?? [],
  );
  const [error, setError] = useState<GameSessionError | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [resigned, setResigned] = useState(false);
  // Counts the AI's moves, so the screen can announce each one once.
  const [aiMoveSignal, setAiMoveSignal] = useState(0);
  const isAiMoveInProgressRef = useRef(false);

  // Derive game state synchronously whenever moves change
  const gameState = useMemo(
    () => computeGameState(moves, playerColor, startingFen),
    [moves, playerColor, startingFen],
  );

  const { isPlayerTurn, currentFen } = gameState;

  // A resignation ends the game without a move, so the position cannot say
  // it. It is recorded the way the web records it: a loss by checkmate
  // status, with `resigned` kept beside it for the screen's wording.
  const gameStatus: GameStatus = resigned ? "checkmate" : gameState.status;
  const playerResult: PlayerResult | null = resigned
    ? "loss"
    : gameState.playerResult;

  const aiMoveFailed = error?.kind === "ai-move-failed";

  // Trigger AI move when it's not the player's turn. This is also what makes
  // the engine move first when a custom start leaves it to move.
  // We compute isPlayerTurn synchronously from moves to avoid a race condition
  // where the state-based isPlayerTurn lags behind the latest moves array
  // (causing the AI to move repeatedly in an infinite loop).
  // We use the memoized gameState directly here since effects run after render,
  // preventing lag between strictly managed state and generic derivations.
  // A failed attempt stops here until `retryAiMove` clears the error: asking
  // again on every render would hide the failure behind an endless spinner.
  useEffect(() => {
    if (
      isPlayerTurn ||
      gameStatus !== "in_progress" ||
      aiMoveFailed ||
      isAiMoveInProgressRef.current
    ) {
      return;
    }

    isAiMoveInProgressRef.current = true;
    setIsAiThinking(true);

    getAiMove(moves, startingFen)
      .then((result) => {
        if (result.ok) {
          // The reply answers `moves` as they were when it was asked for.
          // Applied to any other list it would be a move from a different
          // position.
          setMoves((prev) => (prev === moves ? [...prev, result.value] : prev));
          setAiMoveSignal((signal) => signal + 1);
          setError(null);
          return;
        }
        console.error("AI move failed:", result.error);
        setError({ kind: "ai-move-failed" });
      })
      .catch((err) => {
        // getAiMove reports its failures as values; anything thrown here is
        // unexpected.
        console.error("AI move failed unexpectedly:", err);
        setError({ kind: "ai-move-failed" });
      })
      .finally(() => {
        isAiMoveInProgressRef.current = false;
        setIsAiThinking(false);
      });
  }, [
    moves,
    playerColor,
    getAiMove,
    isPlayerTurn,
    gameStatus,
    startingFen,
    aiMoveFailed,
  ]);

  const submitMove = useCallback(
    (move: AlgebraicNotation) => {
      if (!isPlayerTurn || gameStatus !== "in_progress" || isAiLoading) {
        return false;
      }

      if (!validateGameMove(moves, move, startingFen)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError({ kind: "invalid-move", input: move });
        return false;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMoves((prev) => [...prev, move]);
      setError(null);
      return true;
    },
    [isPlayerTurn, gameStatus, isAiLoading, moves, startingFen],
  );

  const retryAiMove = useCallback(() => {
    resetAi?.();
    // Clearing the error is what lets the effect above ask again.
    setError(null);
  }, [resetAi]);

  // Undo takes back the player's last move and the reply to it, so it is
  // offered on the player's turn only, once both exist.
  const canUndo =
    gameStatus === "in_progress" &&
    isPlayerTurn &&
    !isAiThinking &&
    moves.length >= UNDO_PLIES;

  const undo = useCallback(() => {
    if (!canUndo) return;
    setMoves((prev) => prev.slice(0, -UNDO_PLIES));
    setError(null);
  }, [canUndo]);

  const canResign = gameStatus === "in_progress" && !isAiThinking;

  const resign = useCallback(() => {
    if (!canResign) return;
    setResigned(true);
    setError(null);
  }, [canResign]);

  return {
    moves,
    gameStatus,
    playerResult,
    resigned,
    isPlayerTurn,
    isAiThinking,
    error,
    aiMoveFailed,
    aiMoveSignal,
    currentFen,
    submitMove,
    retryAiMove,
    canUndo,
    undo,
    canResign,
    resign,
    playerColor,
    skillLevel,
    startingFen,
  };
}
