import { useEffect, useRef, useState } from 'react';

import { computeGameState } from '@blindfold-chess/features/ai-game';
import type { GameStatus } from '@blindfold-chess/features/ai-game';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

type UseAiMoveOrchestrationOptions = {
  shouldMakeAiMove: boolean;
  gameStatus: GameStatus;
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen: string | undefined;
  getAiMove: (
    moves: AlgebraicNotation[],
    startingFen?: string
  ) => Promise<AlgebraicNotation | null>;
  onAiMoveSuccess: (move: AlgebraicNotation) => void;
  onAiMoveError: () => void;
};

type UseAiMoveOrchestrationResult = {
  isLoading: boolean;
  isProcessing: boolean;
};

/**
 * Hook to orchestrate AI move execution with retry logic.
 *
 * Handles:
 * - Retry logic when engine is busy (up to 10 retries with 200ms delay)
 * - Processing state management
 * - Error handling
 */
export function useAiMoveOrchestration({
  shouldMakeAiMove,
  gameStatus,
  moves,
  playerSide,
  startingFen,
  getAiMove,
  onAiMoveSuccess,
  onAiMoveError,
}: UseAiMoveOrchestrationOptions): UseAiMoveOrchestrationResult {
  const [isLoading, setIsLoading] = useState(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const executeAiMove = async () => {
      if (isProcessingRef.current) {
        return;
      }

      // Guard against stale shouldMakeAiMove: verify it's actually AI's turn
      const currentState = computeGameState(moves, playerSide, startingFen);
      if (currentState.isPlayerTurn || currentState.status !== 'in_progress') {
        return;
      }

      isProcessingRef.current = true;
      setIsLoading(true);

      // Retry logic for when engine is busy (can happen in StrictMode)
      const maxRetries = 10;
      const retryDelay = 200; // ms

      let aiMove: AlgebraicNotation | null = null;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (isCancelled) {
          return;
        }

        try {
          aiMove = await getAiMove(moves, startingFen);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          // If engine is busy, wait and retry
          if (error instanceof Error && error.message.includes('already processing')) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }
          // For other errors, don't retry
          break;
        }
      }

      // Check if this effect was cleaned up while we were waiting
      if (isCancelled) {
        return;
      }

      if (aiMove) {
        onAiMoveSuccess(aiMove);
      } else if (lastError) {
        console.error('Failed to get AI move:', lastError);
        onAiMoveError();
      }

      if (!isCancelled) {
        setIsLoading(false);
        isProcessingRef.current = false;
      }
    };

    if (shouldMakeAiMove && gameStatus === 'in_progress') {
      executeAiMove();
    }

    return () => {
      isCancelled = true;
      // Reset processing and loading state on cleanup
      // This is important when the effect re-runs after AI move is added (moves changes)
      // Without this, isLoading stays true and MoveInput becomes disabled
      isProcessingRef.current = false;
      setIsLoading(false);
    };
  }, [
    shouldMakeAiMove,
    gameStatus,
    moves,
    playerSide,
    getAiMove,
    startingFen,
    onAiMoveSuccess,
    onAiMoveError,
  ]);

  return {
    isLoading,
    isProcessing: isProcessingRef.current,
  };
}
