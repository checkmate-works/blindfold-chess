import { useCallback, useRef } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { validateGameMove } from '@blindfold-chess/features/ai-game';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

type UsePlayerMoveOptions = {
  moves: AlgebraicNotation[];
  startingFen: string | undefined;
  isLoading: boolean;
  isPlayerTurn: boolean;
  pushMove: (move: AlgebraicNotation) => void;
  markPlayerInteraction: () => void;
  setLastMove: (lastMove: { from: string; to: string } | null) => void;
  setMoveInput: (input: string) => void;
  setError: (error: string | null) => void;
  setLastAttemptedInput: (input: string) => void;
};

export function usePlayerMove({
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
}: UsePlayerMoveOptions) {
  const t = useTranslations('play');
  const lastSubmittedMoveRef = useRef<{ move: string; timestamp: number } | null>(null);

  const handleSubmitMove = useCallback(
    (move: AlgebraicNotation): boolean => {
      if (isLoading) {
        return false;
      }

      if (!isPlayerTurn) {
        return false;
      }

      const now = Date.now();
      if (lastSubmittedMoveRef.current) {
        const { move: lastMove, timestamp } = lastSubmittedMoveRef.current;
        if (lastMove === move && now - timestamp < 500) {
          return false;
        }
      }

      if (validateGameMove(moves, move, startingFen)) {
        lastSubmittedMoveRef.current = { move, timestamp: now };
        markPlayerInteraction();
        pushMove(move);
        setMoveInput('');
        setError(null);
        setLastAttemptedInput('');

        const newMoves = [...moves, move];
        setLastMove(getLastMoveDetails(newMoves as string[], startingFen));
        return true;
      } else {
        setLastAttemptedInput(move);
        setError(t('invalidMove'));
        return false;
      }
    },
    [
      moves,
      pushMove,
      t,
      markPlayerInteraction,
      isLoading,
      isPlayerTurn,
      startingFen,
      setLastMove,
      setMoveInput,
      setError,
      setLastAttemptedInput,
    ]
  );

  return {
    handleSubmitMove,
  };
}
