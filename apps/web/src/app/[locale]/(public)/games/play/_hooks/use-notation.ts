import { useCallback, useMemo, useState } from 'react';

import {
  getStartingFen as chessCoreGetStartingFen,
  generatePgn,
  getFenAfterMoves,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import { parseFenMeta } from '../_lib/fen-utils';
import type { FormattedPgnMove } from '../_lib/pgn-parser';

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

  const getSimplePgn = useCallback(() => {
    if (moves.length === 0) {
      return '';
    }

    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);

    const formattedMoves: string[] = [];

    if (startsAsBlack) {
      // First move is black's
      formattedMoves.push(`${startMoveNumber}... ${moves[0]}`);
      for (let i = 1; i < moves.length; i += 2) {
        const moveNumber = startMoveNumber + Math.floor((i + 1) / 2);
        const whiteMove = moves[i];
        const blackMove = moves[i + 1];

        if (blackMove) {
          formattedMoves.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
        } else {
          formattedMoves.push(`${moveNumber}. ${whiteMove}`);
        }
      }
    } else {
      for (let i = 0; i < moves.length; i += 2) {
        const moveNumber = startMoveNumber + Math.floor(i / 2);
        const whiteMove = moves[i];
        const blackMove = moves[i + 1];

        if (blackMove) {
          formattedMoves.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
        } else {
          formattedMoves.push(`${moveNumber}. ${whiteMove}`);
        }
      }
    }

    return formattedMoves.join(' ');
  }, [moves, startingFen]);

  const formattedPgn = useMemo(() => {
    if (moves.length === 0) {
      return [];
    }

    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);

    const formattedMoves: FormattedPgnMove[] = [];

    if (startsAsBlack) {
      // First move is black's
      formattedMoves.push({
        moveNumber: startMoveNumber,
        blackMove: moves[0],
        blackMoveIndex: 0,
      });
      // Pair remaining moves (white, black, white, black...)
      for (let i = 1; i < moves.length; i += 2) {
        const moveNumber = startMoveNumber + Math.floor((i + 1) / 2);
        formattedMoves.push({
          moveNumber,
          whiteMove: moves[i],
          whiteMoveIndex: i,
          blackMove: moves[i + 1],
          blackMoveIndex: moves[i + 1] !== undefined ? i + 1 : undefined,
        });
      }
    } else {
      // Normal: first move is white's
      for (let i = 0; i < moves.length; i += 2) {
        const moveNumber = startMoveNumber + Math.floor(i / 2);
        formattedMoves.push({
          moveNumber,
          whiteMove: moves[i],
          whiteMoveIndex: i,
          blackMove: moves[i + 1],
          blackMoveIndex: moves[i + 1] !== undefined ? i + 1 : undefined,
        });
      }
    }

    return formattedMoves;
  }, [moves, startingFen]);

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
