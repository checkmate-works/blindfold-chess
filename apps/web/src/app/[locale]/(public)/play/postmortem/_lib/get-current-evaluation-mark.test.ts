import { describe, expect, test } from 'vitest';

import type { MoveLogEntry } from './evaluation-helpers';
import { getCurrentEvaluationMark } from './get-current-evaluation-mark';

describe('getCurrentEvaluationMark', () => {
  const lastMove = { from: 'e2', to: 'e4' };

  test('returns null when currentLastMove is null', () => {
    const result = getCurrentEvaluationMark(0, 1, null, []);
    expect(result).toBeNull();
  });

  test('returns null for empty moveLog', () => {
    const result = getCurrentEvaluationMark(0, 1, lastMove, []);
    expect(result).toBeNull();
  });

  test('returns null when currentPosition is -2 (before any move)', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: { score: 30, text: 'Best', loss: 0 },
      },
    ];
    const result = getCurrentEvaluationMark(-2, 1, lastMove, moveLog);
    expect(result).toBeNull();
  });

  test('currentPosition=-1 maps to last user move index', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: { score: 30, text: 'Best', loss: 5 },
      },
      {
        moveNumber: 1,
        isWhiteMove: false,
        move: 'e5',
        status: 'correct',
        evaluation: { score: -10, text: 'Good', loss: 15 },
      },
    ];
    // userMovesLength=2, so moveIndex = 2-1 = 1
    const result = getCurrentEvaluationMark(-1, 2, lastMove, moveLog);
    expect(result).toEqual({
      square: 'e4',
      loss: 15,
      isMate: false,
    });
  });

  test('returns evaluation mark for a specific position', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: { score: 30, text: 'Best', loss: 0 },
      },
    ];
    const result = getCurrentEvaluationMark(0, 1, lastMove, moveLog);
    expect(result).toEqual({
      square: 'e4',
      loss: 0,
      isMate: false,
    });
  });

  test('returns null when entry at moveIndex has no evaluation', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
      },
    ];
    const result = getCurrentEvaluationMark(0, 1, lastMove, moveLog);
    expect(result).toBeNull();
  });

  test('skips incorrect entries when counting move index', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: { score: 30, text: 'Best', loss: 0 },
      },
      {
        moveNumber: 1,
        isWhiteMove: false,
        move: 'e5',
        status: 'incorrect',
        incorrectMove: 'd5',
      },
      {
        moveNumber: 1,
        isWhiteMove: false,
        move: 'e5',
        status: 'correct',
        evaluation: { score: -10, text: 'Good', loss: 20 },
      },
    ];
    // moveIndex=1 should skip the 'incorrect' entry and match the 2nd correct entry
    const result = getCurrentEvaluationMark(1, 2, lastMove, moveLog);
    expect(result).toEqual({
      square: 'e4',
      loss: 20,
      isMate: false,
    });
  });

  test('returns isMate=true when mate is defined in evaluation', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'Qh5',
        status: 'correct',
        evaluation: { score: 9999, mate: 1, text: 'Best', loss: 0 },
      },
    ];
    const result = getCurrentEvaluationMark(0, 1, { from: 'd1', to: 'h5' }, moveLog);
    expect(result).toEqual({
      square: 'h5',
      loss: 0,
      isMate: true,
    });
  });

  test('uses the to-square from currentLastMove', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'Nf3',
        status: 'correct',
        evaluation: { score: 15, text: 'Best', loss: 5 },
      },
    ];
    const result = getCurrentEvaluationMark(0, 1, { from: 'g1', to: 'f3' }, moveLog);
    expect(result).toEqual({
      square: 'f3',
      loss: 5,
      isMate: false,
    });
  });

  test('returns null when moveIndex exceeds available correct entries', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: { score: 30, text: 'Best', loss: 0 },
      },
    ];
    // Requesting index=5 when only 1 correct entry exists
    const result = getCurrentEvaluationMark(5, 6, lastMove, moveLog);
    expect(result).toBeNull();
  });

  test('handles multiple incorrect entries interspersed', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'incorrect',
        incorrectMove: 'd4',
      },
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'incorrect',
        incorrectMove: 'c4',
      },
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: { score: 30, text: 'Best', loss: 0 },
      },
    ];
    // moveIndex=0 should skip both incorrect entries and match the correct one
    const result = getCurrentEvaluationMark(0, 1, lastMove, moveLog);
    expect(result).toEqual({
      square: 'e4',
      loss: 0,
      isMate: false,
    });
  });

  test('handles auto status entries as non-incorrect', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'auto',
        evaluation: { score: 30, text: 'Best', loss: 0 },
      },
      {
        moveNumber: 1,
        isWhiteMove: false,
        move: 'e5',
        status: 'correct',
        evaluation: { score: -10, text: 'Good', loss: 10 },
      },
    ];
    // auto entries are not 'incorrect', so they count
    const result = getCurrentEvaluationMark(0, 2, lastMove, moveLog);
    expect(result).toEqual({
      square: 'e4',
      loss: 0,
      isMate: false,
    });
  });
});
