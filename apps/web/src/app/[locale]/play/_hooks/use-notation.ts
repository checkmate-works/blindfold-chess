import { useCallback, useState } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/types';
import { Chess } from 'chess.js';

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

  const getFen = useCallback(() => {
    // Initialize with custom FEN or standard starting position
    const chess = startingFen ? new Chess(startingFen) : new Chess();
    try {
      for (const move of moves) {
        try {
          chess.move(move);
        } catch (error) {
          console.warn('[getFen] Error applying move, stopping at last valid state:', move, error);
          break;
        }
      }
    } catch (error) {
      console.error('[getFen] Critical error:', error);
      // fallback to starting position ONLY if even the empty board crashed (highly unlikely)
      // or we can just return whatever state we have
    }

    const fen = chess.fen();
    return fen;
  }, [moves, startingFen]);

  const getPgn = useCallback(() => {
    // Initialize with custom FEN or standard starting position
    const chess = startingFen ? new Chess(startingFen) : new Chess();
    try {
      for (const move of moves) {
        try {
          chess.move(move);
        } catch (error) {
          console.warn('[getPgn] Error applying move, stopping at last valid state:', move, error);
          break;
        }
      }
    } catch (error) {
      console.error('[getPgn] Critical error:', error);
    }

    const pgn = chess.pgn();
    return pgn;
  }, [moves, startingFen]);

  const getStartingFen = useCallback(() => {
    return startingFen;
  }, [startingFen]);

  const getSimplePgn = useCallback(() => {
    if (moves.length === 0) {
      return '';
    }

    const startsAsBlack = startingFen ? startingFen.split(' ')[1] === 'b' : false;
    const startMoveNumber = startingFen ? parseInt(startingFen.split(' ')[5]) || 1 : 1;

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

  const getFormattedPgn = useCallback(() => {
    if (moves.length === 0) {
      return [];
    }

    const startsAsBlack = startingFen ? startingFen.split(' ')[1] === 'b' : false;
    const startMoveNumber = startingFen ? parseInt(startingFen.split(' ')[5]) || 1 : 1;

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
    getFen,
    getPgn,
    getSimplePgn,
    getFormattedPgn,
    getStartingFen,
  };
}
