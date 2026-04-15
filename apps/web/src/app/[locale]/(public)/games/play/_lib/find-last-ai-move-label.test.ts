import type { AlgebraicNotation } from '@blindfold-chess/types';
import { describe, expect, it, vi } from 'vitest';

import { findLastAiMoveLabel } from './find-last-ai-move-label';

const t = vi.fn((_key: 'aiPlayed', values: { move: string }) => `AI played ${values.move}`);

describe('findLastAiMoveLabel', () => {
  it('returns null when there are no moves yet', () => {
    expect(findLastAiMoveLabel([], 'white', undefined, t)).toBeNull();
  });

  it('returns null when every move was made by the player (no AI move to announce)', () => {
    // Player is white, single move is white's — no AI move exists.
    const moves = ['e4'] as AlgebraicNotation[];
    expect(findLastAiMoveLabel(moves, 'white', undefined, t)).toBeNull();
  });

  it('announces the AI response from the standard starting position (player = white)', () => {
    const moves = ['e4', 'e5'] as AlgebraicNotation[];
    expect(findLastAiMoveLabel(moves, 'white', undefined, t)).toBe('AI played 1... e5');
  });

  it('announces the AI opening move when player is black', () => {
    const moves = ['d4'] as AlgebraicNotation[];
    expect(findLastAiMoveLabel(moves, 'black', undefined, t)).toBe('AI played 1. d4');
  });

  it('walks backwards past player moves to find the most recent AI move', () => {
    // Player white: indices 0, 2 are player; index 1 is AI.
    // Latest AI move is at index 1 (e5), move number 1, black's move.
    const moves = ['e4', 'e5', 'Nf3'] as AlgebraicNotation[];
    expect(findLastAiMoveLabel(moves, 'white', undefined, t)).toBe('AI played 1... e5');
  });

  it('honors the starting move number from a custom FEN', () => {
    // Move-number field in FEN is 10 (white to move).
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 10';
    const moves = ['e4', 'e5'] as AlgebraicNotation[];
    expect(findLastAiMoveLabel(moves, 'white', fen, t)).toBe('AI played 10... e5');
  });

  it('handles "starts as black" FENs correctly', () => {
    // FEN says black to move, move number 5. Player is black, so the AI (white)
    // will play move #6 after black's first ply. Array index 1 is the AI move.
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 5';
    const moves = ['e5', 'Nf3'] as AlgebraicNotation[];
    expect(findLastAiMoveLabel(moves, 'black', fen, t)).toBe('AI played 6. Nf3');
  });
});
