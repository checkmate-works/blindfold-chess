import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";
import { GameStateService } from "@blindfold-chess/features/ai-game";

import type { GameStatus, PlayerResult, SkillLevel } from "../lib/types";

type UseGameSessionProps = {
  playerColor: Side;
  skillLevel: SkillLevel;
  getAiMove: (
    moves: AlgebraicNotation[],
    startingFen?: string,
  ) => Promise<AlgebraicNotation>;
  isAiLoading: boolean;
};

export function useGameSession({
  playerColor,
  skillLevel,
  getAiMove,
  isAiLoading,
}: UseGameSessionProps) {
  const [moves, setMoves] = useState<AlgebraicNotation[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>("in_progress");
  const [playerResult, setPlayerResult] = useState<PlayerResult | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(playerColor === "white");
  const [error, setError] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const isAiMoveInProgressRef = useRef(false);

  // Update game state after moves change
  useEffect(() => {
    const gameState = new GameStateService(moves, playerColor);
    const status = gameState.getGameStatus();
    const result = gameState.getPlayerResult();
    const playerTurn = gameState.isPlayerTurn();

    setGameStatus(status);
    setPlayerResult(result);
    setIsPlayerTurn(playerTurn);
  }, [moves, playerColor]);

  // Trigger AI move when it's not the player's turn.
  // We compute isPlayerTurn synchronously from moves to avoid a race condition
  // where the state-based isPlayerTurn lags behind the latest moves array
  // (causing the AI to move repeatedly in an infinite loop).
  useEffect(() => {
    const currentGameState = new GameStateService(moves, playerColor);
    const currentStatus = currentGameState.getGameStatus();
    const currentIsPlayerTurn = currentGameState.isPlayerTurn();

    if (
      currentIsPlayerTurn ||
      currentStatus !== "in_progress" ||
      isAiMoveInProgressRef.current
    ) {
      return;
    }

    isAiMoveInProgressRef.current = true;
    setIsAiThinking(true);

    getAiMove(moves)
      .then((aiMove) => {
        setMoves((prev) => [...prev, aiMove]);
        setError(null);
      })
      .catch((err) => {
        console.error("AI move failed:", err);
        setError("AI move failed. Please try again.");
      })
      .finally(() => {
        isAiMoveInProgressRef.current = false;
        setIsAiThinking(false);
      });
  }, [moves, playerColor, getAiMove]);

  const submitMove = useCallback(
    (move: AlgebraicNotation) => {
      if (!isPlayerTurn || gameStatus !== "in_progress" || isAiLoading) {
        return false;
      }

      const gameState = new GameStateService(moves, playerColor);

      if (!gameState.validateMove(move)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Invalid move");
        return false;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMoves((prev) => [...prev, move]);
      setError(null);
      return true;
    },
    [isPlayerTurn, gameStatus, isAiLoading, moves, playerColor],
  );

  const currentFen = useMemo(() => {
    const gameState = new GameStateService(moves, playerColor);
    return gameState.getFen();
  }, [moves, playerColor]);

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
