import { describe, expect, it } from 'vitest';

import type { DetailedPieceStats, SimpleScoreStats } from './practice-complete-types';
import { isDetailedPieceStats } from './practice-complete-types';

describe('isDetailedPieceStats', () => {
  it('returns true for a valid DetailedPieceStats object', () => {
    const stats: DetailedPieceStats = {
      correctPieces: 10,
      totalPieces: 16,
      incorrectPieces: 2,
      missingPieces: 3,
      extraPieces: 1,
    };
    expect(isDetailedPieceStats(stats)).toBe(true);
  });

  it('returns false for a SimpleScoreStats object', () => {
    const stats: SimpleScoreStats = {
      correct: 8,
      incorrect: 2,
      total: 10,
    };
    expect(isDetailedPieceStats(stats)).toBe(false);
  });

  it('returns true when all DetailedPieceStats values are zero', () => {
    const stats: DetailedPieceStats = {
      correctPieces: 0,
      totalPieces: 0,
      incorrectPieces: 0,
      missingPieces: 0,
      extraPieces: 0,
    };
    expect(isDetailedPieceStats(stats)).toBe(true);
  });

  it('returns false when all SimpleScoreStats values are zero', () => {
    const stats: SimpleScoreStats = {
      correct: 0,
      incorrect: 0,
      total: 0,
    };
    expect(isDetailedPieceStats(stats)).toBe(false);
  });

  it('returns true for an object with missingPieces and extra properties', () => {
    const stats = {
      correctPieces: 5,
      totalPieces: 10,
      incorrectPieces: 1,
      missingPieces: 2,
      extraPieces: 1,
      someExtraField: 'unexpected',
    } as DetailedPieceStats;
    expect(isDetailedPieceStats(stats)).toBe(true);
  });
});
