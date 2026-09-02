import { useCallback, useMemo, useState } from 'react';

import {
  getStartingFen as chessCoreGetStartingFen,
  generatePgn,
  getFenAfterMoves,
} from '@blindfold-chess/features/chess-core';
import { formatMovesToPgn, formatPgnToText } from '@blindfold-chess/features/chess-core/pgn-format';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { parseFenMeta } from '../_lib/fen-utils';

type UseNotationOptions = {
  initialMoves?: AlgebraicNotation[];
  startingFen?: string;
};

export function useNotation(initialMovesOrOptions: AlgebraicNotation[] | UseNotationOptions = []) {
  // Handle both old signature (array) and new signature (options object)
  const options: UseNotationOptions = Array.isArray(initialMovesOrOptions)
    ? { initialMoves: initialMovesOrOptions }
    : initialMovesOrOptions;

  const { initialMoves = [], startingFen } = options;

  const [moves, setMoves] = useState<AlgebraicNotation[]>(initialMoves);

  const pushMove = useCallback((move: AlgebraicNotation) => {
    setMoves((prev) => {
      const newMoves = [...prev, move];
      return newMoves;
    });
  }, []);

  const popMove = useCallback(() => {
    setMoves((prev) => prev.slice(0, -1));
  }, []);

  const clearMoves = useCallback(() => {
    setMoves([]);
  }, []);

  const removeMoves = useCallback((count: number) => {
    setMoves((prev) => prev.slice(0, -count));
  }, []);

  const setMovesTo = useCallback((newMoves: AlgebraicNotation[]) => {
    setMoves(newMoves);
  }, []);

  const fen = useMemo(() => {
    try {
      const initialFen = startingFen ?? chessCoreGetStartingFen();
      return getFenAfterMoves(initialFen, moves as string[]);
    } catch (error) {
      console.error('[getFen] Critical error:', error);
      return startingFen ?? chessCoreGetStartingFen();
    }
  }, [moves, startingFen]);

  const getPgn = useCallback(() => {
    try {
      return generatePgn(moves as string[], startingFen);
    } catch (error) {
      console.error('[getPgn] Critical error:', error);
      return '';
    }
  }, [moves, startingFen]);

  const getStartingFen = useCallback(() => {
    return startingFen;
  }, [startingFen]);

  const formattedPgn = useMemo(() => {
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    return formatMovesToPgn(moves, startsAsBlack, startMoveNumber);
  }, [moves, startingFen]);

  const getSimplePgn = useCallback(() => formatPgnToText(formattedPgn), [formattedPgn]);

  return {
    moves,
    pushMove,
    popMove,
    clearMoves,
    removeMoves,
    setMovesTo,
    fen,
    getPgn,
    getSimplePgn,
    formattedPgn,
    getStartingFen,
  };
}
