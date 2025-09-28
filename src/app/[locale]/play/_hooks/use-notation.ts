import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import type { AlgebraicNotation } from '@/lib/types';

export function useNotation(initialMoves: AlgebraicNotation[] = []) {
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
    const chess = new Chess();
    try {
      for (const move of moves) {
        chess.move(move);
      }
    } catch (error) {
      console.error('[getFen] Error applying moves:', error);
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // fallback to starting position
    }

    const fen = chess.fen();
    return fen;
  }, [moves]);

  const getPgn = useCallback(() => {
    const chess = new Chess();
    try {
      for (const move of moves) {
        chess.move(move);
      }
    } catch (error) {
      console.error('[getPgn] Error applying moves:', error);
      return ''; // Return empty string on error
    }

    const pgn = chess.pgn();
    return pgn;
  }, [moves]);

  const getSimplePgn = useCallback(() => {
    if (moves.length === 0) {
      return '';
    }

    // Format moves as "1. e4 e5 2. Nf3 Nc6 ..." (for copying)
    const formattedMoves: string[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      if (blackMove) {
        formattedMoves.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
      } else {
        formattedMoves.push(`${moveNumber}. ${whiteMove}`);
      }
    }

    return formattedMoves.join(' ');
  }, [moves]);

  const getFormattedPgn = useCallback(() => {
    if (moves.length === 0) {
      return [];
    }

    // Format moves as structured data for aligned display
    const formattedMoves: Array<{ moveNumber: number; whiteMove: string; blackMove?: string }> = [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      formattedMoves.push({
        moveNumber,
        whiteMove,
        blackMove,
      });
    }

    return formattedMoves;
  }, [moves]);

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
  };
}
