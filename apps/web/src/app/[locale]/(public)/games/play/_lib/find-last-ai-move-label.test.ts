import type { AlgebraicNotation } from '@blindfold-chess/types';
import { describe, expect, it } from 'vitest';

import { findLastAiMoveNotation } from './find-last-ai-move-label';

describe('findLastAiMoveNotation', () => {
  it('returns null when there are no moves yet', () => {
    expect(findLastAiMoveNotation([], 'white', undefined)).toBeNull();
  });

  it('returns null when every move was made by the player (no AI move to announce)', () => {
    // Player is white, single move is white's — no AI move exists.
    const moves = ['e4'] as AlgebraicNotation[];
    expect(findLastAiMoveNotation(moves, 'white', undefined)).toBeNull();
  });

  it('returns the AI response notation from the standard starting position (player = white)', () => {
    const moves = ['e4', 'e5'] as AlgebraicNotation[];
    expect(findLastAiMoveNotation(moves, 'white', undefined)).toBe('1... e5');
  });

  it('returns the AI opening-move notation when player is black', () => {
    const moves = ['d4'] as AlgebraicNotation[];
    expect(findLastAiMoveNotation(moves, 'black', undefined)).toBe('1. d4');
  });

  it('walks backwards past player moves to find the most recent AI move', () => {
    // Player white: indices 0, 2 are player; index 1 is AI.
    // Latest AI move is at index 1 (e5), move number 1, black's move.
    const moves = ['e4', 'e5', 'Nf3'] as AlgebraicNotation[];
    expect(findLastAiMoveNotation(moves, 'white', undefined)).toBe('1... e5');
  });

  it('honors the starting move number from a custom FEN', () => {
    // Move-number field in FEN is 10 (white to move).
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 10';
    const moves = ['e4', 'e5'] as AlgebraicNotation[];
    expect(findLastAiMoveNotation(moves, 'white', fen)).toBe('10... e5');
  });

  it('handles "starts as black" FENs correctly', () => {
    // FEN says black to move, move number 5. Player is black, so the AI (white)
    // will play move #6 after black's first ply. Array index 1 is the AI move.
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 5';
    const moves = ['e5', 'Nf3'] as AlgebraicNotation[];
    expect(findLastAiMoveNotation(moves, 'black', fen)).toBe('6. Nf3');
  });
});
