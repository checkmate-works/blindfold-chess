import { useCallback, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { validateGameMove } from '@blindfold-chess/features/ai-game';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

type UsePlayerMoveOptions = {
  moves: AlgebraicNotation[];
  playerSide: Side;
  startingFen: string | undefined;
  isLoading: boolean;
  isPlayerTurn: boolean;
  pushMove: (move: AlgebraicNotation) => void;
  markPlayerInteraction: () => void;
  setLastMove: (lastMove: { from: string; to: string } | null) => void;
  setMoveInput: (input: string) => void;
  setError: (error: string | null) => void;
};

export function usePlayerMove({
  moves,
  playerSide,
  startingFen,
  isLoading,
  isPlayerTurn,
  pushMove,
  markPlayerInteraction,
  setLastMove,
  setMoveInput,
  setError,
}: UsePlayerMoveOptions) {
  const t = useTranslations('play');
  const lastSubmittedMoveRef = useRef<{ move: string; timestamp: number } | null>(null);

  const handleSubmitMove = useCallback(
    (move: AlgebraicNotation) => {
      if (isLoading) {
        return;
      }

      if (!isPlayerTurn) {
        return;
      }

      const now = Date.now();
      if (lastSubmittedMoveRef.current) {
        const { move: lastMove, timestamp } = lastSubmittedMoveRef.current;
        if (lastMove === move && now - timestamp < 500) {
          return;
        }
      }

      if (validateGameMove(moves, move, startingFen)) {
        lastSubmittedMoveRef.current = { move, timestamp: now };
        markPlayerInteraction();
        pushMove(move);
        setMoveInput('');
        setError(null);

        const newMoves = [...moves, move];
        setLastMove(getLastMoveDetails(newMoves as string[], startingFen));
      } else {
        setError(t('invalidMove'));
      }
    },
    [
      moves,
      playerSide,
      pushMove,
      t,
      markPlayerInteraction,
      isLoading,
      isPlayerTurn,
      startingFen,
      setLastMove,
      setMoveInput,
      setError,
    ]
  );

  return {
    handleSubmitMove,
  };
}
