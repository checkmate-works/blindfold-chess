import type { PositionAccuracy } from '@/app/[locale]/(public)/practice/_lib/types';

export type AggregatedStats = {
  totalAccuracy: number;
  totalCorrect: number;
  totalPieces: number;
  totalIncorrect: number;
  totalMissing: number;
  totalExtra: number;
};

/**
 * Aggregate accuracy stats from an array of PositionAccuracy results.
 * totalAccuracy is the average accuracy percentage across all results.
 */
export function aggregateResults(resultsArray: PositionAccuracy[]): AggregatedStats {
  const totalAccuracy =
    resultsArray.length > 0
      ? resultsArray.reduce((sum, r) => sum + r.accuracy, 0) / resultsArray.length
      : 0;
  const totalCorrect = resultsArray.reduce((sum, r) => sum + r.correctPieces, 0);
  const totalPieces = resultsArray.reduce((sum, r) => sum + r.totalPieces, 0);
  const totalIncorrect = resultsArray.reduce((sum, r) => sum + r.incorrectPieces, 0);
  const totalMissing = resultsArray.reduce((sum, r) => sum + r.missingPieces, 0);
  const totalExtra = resultsArray.reduce((sum, r) => sum + r.extraPieces, 0);

  return {
    totalAccuracy,
    totalCorrect,
    totalPieces,
    totalIncorrect,
    totalMissing,
    totalExtra,
  };
}
