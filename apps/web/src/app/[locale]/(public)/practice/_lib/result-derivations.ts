import type { ScoreStats } from './practice-complete-types';

/**
 * Default derivations from the result page's search params. Extracted from
 * `createPracticeResultClient` so the parsing/stats rules are pure and
 * testable; modules with special shapes override via the factory's
 * `resolveScoreTotal` / `buildScoreStats` / `buildAverageTimeText` callbacks.
 */

/** Default score/total parsing from the `score` / `total` params. */
export function parseScoreTotal(searchParams: URLSearchParams): {
  score: number;
  total: number;
} {
  return {
    score: parseInt(searchParams.get('score') || '0', 10),
    total: parseInt(searchParams.get('total') || '0', 10),
  };
}

/** Elapsed seconds from the `time` param (integer read). */
export function parseTimeElapsed(searchParams: URLSearchParams): number {
  return parseInt(searchParams.get('time') || '0', 10);
}

/**
 * The factory's default average-time text: seconds-per-answer from the raw
 * `time` param (float read, matching the historical behaviour), hidden
 * (undefined) when there are no answers.
 */
export function computeDefaultAverageTimeText(
  searchParams: URLSearchParams,
  total: number,
  formatSeconds: (seconds: string) => string
): string | undefined {
  if (total <= 0) return undefined;
  const time = parseFloat(searchParams.get('time') || '0');
  return formatSeconds((time / total).toFixed(1));
}

/** Default score breakdown: incorrect = total - score. */
export function defaultScoreStats(score: number, total: number): ScoreStats {
  return { correct: score, incorrect: total - score, total };
}
