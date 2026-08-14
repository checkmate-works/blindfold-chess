import { describe, expect, it } from 'vitest';

import type { MoveAnalysis, MoveJudgment } from '@/lib/games/analysis/types';

import { MAX_REVIEW_MOMENTS, buildReviewInput } from './input';

function analysis(
  ply: number,
  color: 'white' | 'black',
  cpLoss: number,
  judgment: MoveJudgment
): MoveAnalysis {
  return {
    ply,
    san: 'e4',
    moveNumber: Math.floor(ply / 2) + 1,
    color,
    evalBefore: 0,
    evalAfter: -cpLoss,
    cpLoss,
    bestMoveSan: 'Nf3',
    judgment,
  };
}

describe('buildReviewInput', () => {
  it('selects player inaccuracies-or-worse plus opponent blunders, in game order', () => {
    const input = buildReviewInput(
      [
        analysis(0, 'white', 10, 'best'),
        analysis(1, 'black', 400, 'blunder'), // opponent blunder → in
        analysis(2, 'white', 80, 'inaccuracy'), // player → in
        analysis(3, 'black', 120, 'mistake'), // opponent mistake → OUT
        analysis(4, 'white', 350, 'blunder'), // player → in
        analysis(5, 'black', 30, 'good'),
      ],
      'white'
    );

    expect(input.moments.map((m) => m.ply)).toEqual([1, 2, 4]);
  });

  it('caps at MAX_REVIEW_MOMENTS keeping the worst losses', () => {
    const analyses: MoveAnalysis[] = [];
    for (let i = 0; i < 30; i++) {
      // Player (white) mistakes with increasing loss: plies 0,2,4,...58.
      analyses.push(analysis(i * 2, 'white', 150 + i, 'mistake'));
      analyses.push(analysis(i * 2 + 1, 'black', 0, 'best'));
    }

    const input = buildReviewInput(analyses, 'white');

    expect(input.moments).toHaveLength(MAX_REVIEW_MOMENTS);
    // The kept moments are the 12 largest losses (the last 12 mistakes),
    // re-sorted chronologically.
    const plies = input.moments.map((m) => m.ply);
    expect(plies).toEqual([...plies].sort((a, b) => a - b));
    expect(Math.min(...input.moments.map((m) => m.cpLoss))).toBe(150 + 18);
  });

  it('aggregates player-only stats', () => {
    const input = buildReviewInput(
      [
        analysis(0, 'white', 0, 'best'),
        analysis(1, 'black', 500, 'blunder'),
        analysis(2, 'white', 100, 'inaccuracy'),
        analysis(3, 'black', 0, 'best'),
      ],
      'white'
    );

    expect(input.summaryStats).toEqual({
      totalPlies: 4,
      playerColor: 'white',
      avgCpLossPlayer: 50,
      judgmentCountsPlayer: { best: 1, good: 0, inaccuracy: 1, mistake: 0, blunder: 0 },
    });
  });

  it('handles a clean game (no moments) without failing', () => {
    const input = buildReviewInput(
      [analysis(0, 'white', 0, 'best'), analysis(1, 'black', 5, 'best')],
      'white'
    );
    expect(input.moments).toEqual([]);
    expect(input.summaryStats.avgCpLossPlayer).toBe(0);
  });
});
