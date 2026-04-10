/**
 * Result-page URL builders for the position-memory feature.
 *
 * Both the multi-problem and single-position session flows redirect to a
 * result page by encoding the run into URL search params. Keeping the
 * serialization in one place makes the query-param schema (1-char keys)
 * easier to audit and evolve.
 */
import type { Locale } from '@/app/[locale]/_lib/types';

import {
  type SerializedResultItem,
  type SerializedStats,
  serializeResults,
  serializeStats,
} from './result-serde';

export type BuildMultiResultUrlArgs = {
  locale: Locale;
  results: SerializedResultItem[];
  stats: SerializedStats;
  totalAccuracy: number;
  isCustomFen: boolean;
  timeLimit: number;
  shuffle: boolean;
  problemCount: number;
  rawProblemsParam?: string;
  sourceParam?: string;
  modeParam?: string;
};

/**
 * Build the result-page URL for a multi-problem (preset / custom FEN) session.
 *
 * Preserves every retry-related parameter so the result page's "try again"
 * link can reconstruct the same session configuration.
 */
export function buildMultiResultUrl({
  locale,
  results,
  stats,
  totalAccuracy,
  isCustomFen,
  timeLimit,
  shuffle,
  problemCount,
  rawProblemsParam,
  sourceParam,
  modeParam,
}: BuildMultiResultUrlArgs): string {
  const params = new URLSearchParams();
  params.set('score', Math.round(totalAccuracy).toString());
  params.set('total', '100');
  params.set('custom', isCustomFen ? 'true' : 'false');
  params.set('data', serializeResults(results));
  params.set('stats', serializeStats(stats));

  // Pass through session configuration for retry
  params.set('timeLimit', timeLimit.toString());
  params.set('shuffle', shuffle ? '1' : '0');
  params.set('count', problemCount.toString());
  if (rawProblemsParam) params.set('problems', rawProblemsParam);
  if (sourceParam) params.set('source', sourceParam);
  if (modeParam) params.set('mode', modeParam);

  return `/${locale}/practice/position-memory/result?${params.toString()}`;
}

export type BuildSingleResultUrlArgs = {
  locale: Locale;
  positionId: string;
  timeLimit: number;
  results: SerializedResultItem[];
  stats: SerializedStats;
};

/**
 * Build the result-page URL for a single-position session (DB-backed).
 *
 * Uses `toFixed(1)` for `score` to preserve decimal accuracy on the
 * single-position result page (matching the prior behavior).
 */
export function buildSingleResultUrl({
  locale,
  positionId,
  timeLimit,
  results,
  stats,
}: BuildSingleResultUrlArgs): string {
  const first = results[0];
  const params = new URLSearchParams();
  params.set('score', (first?.a ?? 0).toFixed(1));
  params.set('total', '100');
  params.set('data', serializeResults(results));
  params.set('stats', serializeStats(stats));
  params.set('timeLimit', timeLimit.toString());

  return `/${locale}/practice/position-memory/${positionId}/result?${params.toString()}`;
}
