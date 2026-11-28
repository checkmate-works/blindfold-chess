import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Result } from "@blindfold-chess/features/utils";
import type { EngineError } from "../engine";
import * as Haptics from "expo-haptics";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";
import {
  computeGameState,
  validateGameMove,
} from "@blindfold-chess/features/ai-game";
import type { MoveSquares } from "@blindfold-chess/features/board-display";
import type {
  MoveInputMethod,
  MoveOperationLog,
} from "@blindfold-chess/features/game-record";
import { useMoveOperationTracker } from "@blindfold-chess/features/game-record/client";

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
  /** The operation logs of a game being resumed. Read once on mount. */
  initialOperationLogs?: MoveOperationLog[];
};

/**
 * How a finished game ended. `gameStatus` cannot say it on its own: a
 * resignation is recorded as a checkmate status (as on the web), so the
 * screen reads the reason from here to word the result and to mark the
 * losing king with a flag rather than a `#`.
 */
export type GameTermination =
  "checkmate" | "resignation" | "stalemate" | "draw";

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
  initialOperationLogs,
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
  // One log per player move: how it was entered and what help it took (board
  // peeks, takebacks, invalid attempts). The same record the web keeps; the
  // Exp grant reads its aided-move count.
  const {
    logs: operationLogs,
    recordPeek,
    recordInvalid,
    recordUndo,
    commitMove,
    handleUndoLog,
  } = useMoveOperationTracker({ initialLogs: initialOperationLogs });

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

  const termination: GameTermination | null = resigned
    ? "resignation"
    : gameState.status === "in_progress"
      ? null
      : gameState.status;

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
    (move: AlgebraicNotation, inputMethod: MoveInputMethod = "button") => {
      if (!isPlayerTurn || gameStatus !== "in_progress" || isAiLoading) {
        return false;
      }

      if (!validateGameMove(moves, move, startingFen)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        recordInvalid(move);
        setError({ kind: "invalid-move", input: move });
        return false;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      commitMove(inputMethod);
      setMoves((prev) => [...prev, move]);
      setError(null);
      return true;
    },
    [
      isPlayerTurn,
      gameStatus,
      isAiLoading,
      moves,
      startingFen,
      recordInvalid,
      commitMove,
    ],
  );

  // An illegal board attempt (a tap or a drop no legal move reaches). The
  // board only ever sends legal moves to `submitMove`, so its mistakes are
  // counted here, with the squares, as the web counts them. Nothing is
  // written under the keypad: the piece simply stays where it was.
  const recordIllegalBoardMove = useCallback(
    (attempt: string, squares: MoveSquares) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      recordInvalid(attempt, squares);
    },
    [recordInvalid],
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
    // The retracted move's log goes with it (the move "never happened"), and
    // the takeback itself is counted on the move the player makes next.
    handleUndoLog(moves.slice(-UNDO_PLIES));
    recordUndo();
    setMoves((prev) => prev.slice(0, -UNDO_PLIES));
    setError(null);
  }, [canUndo, moves, handleUndoLog, recordUndo]);

  // Editing the rejected move takes its message away, as on the web. Only
  // that message: an AI failure stays until Retry clears it.
  const clearInvalidMove = useCallback(() => {
    setError((current) => (current?.kind === "invalid-move" ? null : current));
  }, []);

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
    termination,
    isPlayerTurn,
    isAiThinking,
    error,
    aiMoveFailed,
    aiMoveSignal,
    operationLogs,
    recordPeek,
    currentFen,
    submitMove,
    recordIllegalBoardMove,
    clearInvalidMove,
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
