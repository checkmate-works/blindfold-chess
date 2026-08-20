import { useEffect, useRef, useState } from 'react';

import { computeGameState } from '@blindfold-chess/features/ai-game';
import type { GameStatus } from '@blindfold-chess/features/ai-game';
import type { Result } from '@blindfold-chess/features/ai-game/opponent';
import { err } from '@blindfold-chess/features/ai-game/opponent';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { AiMoveError } from './use-ai-versus';

type UseAiMoveOrchestrationOptions = {
  shouldMakeAiMove: boolean;
  gameStatus: GameStatus;
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen: string | undefined;
  getAiMove: (
    moves: AlgebraicNotation[],
    startingFen?: string
  ) => Promise<Result<AlgebraicNotation, AiMoveError>>;
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
      let lastError: AiMoveError | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (isCancelled) {
          return;
        }

        let result: Result<AlgebraicNotation, AiMoveError>;
        try {
          result = await getAiMove(moves, startingFen);
        } catch (cause) {
          // getAiMove is a Result-returning boundary and is not expected to
          // throw; if it somehow does, treat it as a failed attempt rather
          // than letting the rejection escape this floating effect promise.
          result = err({ kind: 'move-generation-failed', cause });
        }

        if (result.ok) {
          aiMove = result.value;
          lastError = null;
          break;
        }

        lastError = result.error;
        // A busy engine (StrictMode double-invocation, previous request
        // still in flight) is the one transient kind worth waiting out;
        // every other failure is final for this round.
        if (result.error.kind === 'busy') {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        break;
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
