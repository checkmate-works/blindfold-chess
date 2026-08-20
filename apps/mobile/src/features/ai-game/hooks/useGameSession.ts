import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Result } from "@blindfold-chess/features/utils";
import type { EngineError } from "../engine";
import * as Haptics from "expo-haptics";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";
import {
  computeGameState,
  validateGameMove,
} from "@blindfold-chess/features/ai-game";

import type { SkillLevel } from "../lib/types";

type UseGameSessionProps = {
  playerColor: Side;
  skillLevel: SkillLevel;
  getAiMove: (
    moves: AlgebraicNotation[],
    startingFen?: string,
  ) => Promise<Result<AlgebraicNotation, EngineError>>;
  isAiLoading: boolean;
};

export function useGameSession({
  playerColor,
  skillLevel,
  getAiMove,
  isAiLoading,
}: UseGameSessionProps) {
  const [moves, setMoves] = useState<AlgebraicNotation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const isAiMoveInProgressRef = useRef(false);

  // Derive game state synchronously whenever moves change
  const gameState = useMemo(
    () => computeGameState(moves, playerColor),
    [moves, playerColor],
  );

  const {
    status: gameStatus,
    playerResult,
    isPlayerTurn,
    currentFen,
  } = gameState;

  // Trigger AI move when it's not the player's turn.
  // We compute isPlayerTurn synchronously from moves to avoid a race condition
  // where the state-based isPlayerTurn lags behind the latest moves array
  // (causing the AI to move repeatedly in an infinite loop).
  // We use the memoized gameState directly here since effects run after render,
  // preventing lag between strictly managed state and generic derivations.
  useEffect(() => {
    if (
      isPlayerTurn ||
      gameStatus !== "in_progress" ||
      isAiMoveInProgressRef.current
    ) {
      return;
    }

    isAiMoveInProgressRef.current = true;
    setIsAiThinking(true);

    getAiMove(moves)
      .then((result) => {
        if (result.ok) {
          setMoves((prev) => [...prev, result.value]);
          setError(null);
          return;
        }
        // The kinds are distinguishable now; the message still is not. Saying
        // "still starting up, try again in a moment" for a retryable failure
        // needs its own copy, so that stays a follow-up.
        console.error("AI move failed:", result.error);
        setError("AI move failed. Please try again.");
      })
      .catch((err) => {
        // getAiMove reports its failures as values; anything thrown here is
        // unexpected.
        console.error("AI move failed unexpectedly:", err);
        setError("AI move failed. Please try again.");
      })
      .finally(() => {
        isAiMoveInProgressRef.current = false;
        setIsAiThinking(false);
      });
  }, [moves, playerColor, getAiMove, isPlayerTurn, gameStatus]);

  const submitMove = useCallback(
    (move: AlgebraicNotation) => {
      if (!isPlayerTurn || gameStatus !== "in_progress" || isAiLoading) {
        return false;
      }

      if (!validateGameMove(moves, move)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Invalid move");
        return false;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMoves((prev) => [...prev, move]);
      setError(null);
      return true;
    },
    [isPlayerTurn, gameStatus, isAiLoading, moves],
  );

  return {
    moves,
    gameStatus,
    playerResult,
    isPlayerTurn,
    isAiThinking,
    error,
    currentFen,
    submitMove,
    playerColor,
    skillLevel,
  };
}
