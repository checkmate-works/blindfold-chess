import { describe, expect, test } from 'vitest';

import { buildPreviousEval } from './build-previous-eval';
import type { MoveLogEntry } from './evaluation-helpers';

describe('buildPreviousEval', () => {
  test('returns undefined for empty array', () => {
    expect(buildPreviousEval([])).toBeUndefined();
  });

  test('returns undefined when last entry has no evaluation', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
      },
    ];
    expect(buildPreviousEval(moveLog)).toBeUndefined();
  });

  test('returns undefined when all entries have no evaluation', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
      },
      {
        moveNumber: 1,
        isWhiteMove: false,
        move: 'e5',
        status: 'correct',
      },
    ];
    expect(buildPreviousEval(moveLog)).toBeUndefined();
  });

  test('returns evaluation data from the last entry', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: {
          score: 30,
          text: 'Best',
          loss: 0,
          nextBestMove: 'e5',
        },
      },
    ];
    expect(buildPreviousEval(moveLog)).toEqual({
      score: 30,
      mate: undefined,
      bestMove: 'e5',
    });
  });

  test('returns evaluation from the last entry when mixed entries exist', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: {
          score: 30,
          text: 'Best',
          loss: 0,
          nextBestMove: 'd5',
        },
      },
      {
        moveNumber: 1,
        isWhiteMove: false,
        move: 'e5',
        status: 'correct',
      },
    ];
    // Last entry has no evaluation, so returns undefined
    expect(buildPreviousEval(moveLog)).toBeUndefined();
  });

  test('returns evaluation with mate info when present', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 10,
        isWhiteMove: true,
        move: 'Qh7',
        status: 'correct',
        evaluation: {
          score: 9999,
          mate: 3,
          text: 'Best',
          loss: 0,
          nextBestMove: 'Kf8',
        },
      },
    ];
    expect(buildPreviousEval(moveLog)).toEqual({
      score: 9999,
      mate: 3,
      bestMove: 'Kf8',
    });
  });

  test('returns evaluation without bestMove when nextBestMove is undefined', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: {
          score: 25,
          text: 'Best',
          loss: 0,
        },
      },
    ];
    expect(buildPreviousEval(moveLog)).toEqual({
      score: 25,
      mate: undefined,
      bestMove: undefined,
    });
  });

  test('only considers the last entry, ignoring earlier evaluations', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'correct',
        evaluation: {
          score: 30,
          text: 'Best',
          loss: 0,
          nextBestMove: 'e5',
        },
      },
      {
        moveNumber: 1,
        isWhiteMove: false,
        move: 'e5',
        status: 'correct',
        evaluation: {
          score: -10,
          text: 'Good',
          loss: 10,
          nextBestMove: 'Nf3',
        },
      },
    ];
    expect(buildPreviousEval(moveLog)).toEqual({
      score: -10,
      mate: undefined,
      bestMove: 'Nf3',
    });
  });

  test('handles entries with incorrect status', () => {
    const moveLog: MoveLogEntry[] = [
      {
        moveNumber: 1,
        isWhiteMove: true,
        move: 'e4',
        status: 'incorrect',
        incorrectMove: 'd4',
        evaluation: {
          score: 50,
          text: 'Inaccuracy',
          loss: 80,
          bestMove: 'e4',
          nextBestMove: 'e5',
        },
      },
    ];
    expect(buildPreviousEval(moveLog)).toEqual({
      score: 50,
      mate: undefined,
      bestMove: 'e5',
    });
  });
});
