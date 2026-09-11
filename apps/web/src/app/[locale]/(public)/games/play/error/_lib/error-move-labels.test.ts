import type { AlgebraicNotation } from '@blindfold-chess/types';
import { describe, expect, it } from 'vitest';

import { labelMoveAt, labelMoveList } from './error-move-labels';

const san = (...moves: string[]) => moves as AlgebraicNotation[];

const BLACK_TO_MOVE_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const MOVE_5_WHITE_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5';
const MOVE_5_BLACK_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 5';

describe('labelMoveList', () => {
  it('returns an empty list for no moves', () => {
    expect(labelMoveList([], undefined)).toEqual([]);
  });

  it('numbers White moves only from the initial position', () => {
    expect(labelMoveList(san('e4', 'e5', 'Nf3'), undefined)).toEqual([
      { move: 'e4', label: '1.' },
      { move: 'e5', label: null },
      { move: 'Nf3', label: '2.' },
    ]);
  });

  it('opens with "1..." and pairs from there when Black moves first', () => {
    expect(labelMoveList(san('e5', 'Nf3', 'Nc6'), BLACK_TO_MOVE_FEN)).toEqual([
      { move: 'e5', label: '1...' },
      { move: 'Nf3', label: '2.' },
      { move: 'Nc6', label: null },
    ]);
  });

  it("starts counting from the FEN's fullmove number", () => {
    expect(labelMoveList(san('Nf3', 'Nc6', 'Bb5'), MOVE_5_WHITE_FEN)).toEqual([
      { move: 'Nf3', label: '5.' },
      { move: 'Nc6', label: null },
      { move: 'Bb5', label: '6.' },
    ]);
  });

  it('combines a Black start with a non-1 fullmove number', () => {
    expect(labelMoveList(san('Nc6', 'Bb5'), MOVE_5_BLACK_FEN)).toEqual([
      { move: 'Nc6', label: '5...' },
      { move: 'Bb5', label: '6.' },
    ]);
  });
});

describe('labelMoveAt', () => {
  it('names a ply from the initial position', () => {
    expect(labelMoveAt(0, undefined)).toBe('1.');
    expect(labelMoveAt(1, undefined)).toBe('1...');
    expect(labelMoveAt(4, undefined)).toBe('3.');
  });

  it('names a ply when Black moves first', () => {
    expect(labelMoveAt(0, BLACK_TO_MOVE_FEN)).toBe('1...');
    expect(labelMoveAt(1, BLACK_TO_MOVE_FEN)).toBe('2.');
  });

  it("names a ply from the FEN's fullmove number", () => {
    expect(labelMoveAt(0, MOVE_5_WHITE_FEN)).toBe('5.');
    expect(labelMoveAt(3, MOVE_5_WHITE_FEN)).toBe('6...');
  });
});
