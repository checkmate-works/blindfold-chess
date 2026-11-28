import {
  isBoolean,
  isJsonObject,
  isValidSquare,
  parseEncodedJson,
} from '@blindfold-chess/features/common';
import {
  ROUTE_PLANNER_PIECES,
  type RoutePlannerProblemResult,
} from '@blindfold-chess/features/route-planner';
import type { Square } from '@blindfold-chess/types';

/**
 * The problem list the challenge hands its result page in the `data` param.
 *
 * The param arrives through the URL, so anything can be in it: a value that
 * is not a JSON array is an empty list, and an entry that is not a
 * {@link RoutePlannerProblemResult} is dropped rather than rendered — the
 * result list reads `success` on every entry and spreads `userPath` when a
 * row opens, and would throw on either. The score is counted from this same
 * list, so the summary and the rows never disagree.
 */
export function parseRoutePlannerResults(dataParam: string | null): RoutePlannerProblemResult[] {
  const parsed = parseEncodedJson(dataParam);
  return Array.isArray(parsed) ? parsed.filter(isRoutePlannerProblemResult) : [];
}

/** Score and total of a finished challenge, over the problems that were answered. */
export function scoreRoutePlannerResults(results: readonly RoutePlannerProblemResult[]): {
  score: number;
  total: number;
} {
  // The problem the time limit cut off is listed but was never answered.
  const answered = results.filter((r) => !r.timedOut);
  return { score: answered.filter((r) => r.success).length, total: answered.length };
}

const isSquare = (value: unknown): value is Square =>
  typeof value === 'string' && isValidSquare(value);

const isSquarePath = (value: unknown): value is Square[] =>
  Array.isArray(value) && value.every(isSquare);

const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
  value === undefined || isBoolean(value);

function isRoutePlannerProblemResult(value: unknown): value is RoutePlannerProblemResult {
  return (
    isJsonObject(value) &&
    (ROUTE_PLANNER_PIECES as readonly unknown[]).includes(value.piece) &&
    isSquare(value.start) &&
    isSquare(value.end) &&
    isBoolean(value.success) &&
    isSquarePath(value.userPath) &&
    isSquarePath(value.shortestPath) &&
    isOptionalBoolean(value.skipped) &&
    isOptionalBoolean(value.timedOut)
  );
}
