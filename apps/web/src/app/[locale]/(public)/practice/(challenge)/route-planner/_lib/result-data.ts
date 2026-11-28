import { parseEncodedJson } from '@blindfold-chess/features/common';
import {
  type RoutePlannerProblemResult,
  isRoutePlannerProblemResult,
} from '@blindfold-chess/features/route-planner';

/**
 * The problem list the challenge hands its result page in the `data` param.
 *
 * The param arrives through the URL, so anything can be in it: a value that
 * is not a JSON array is an empty list, and an entry that is not a
 * {@link RoutePlannerProblemResult} is dropped rather than rendered (see
 * `isRoutePlannerProblemResult`). The score is counted from this same list,
 * so the summary and the rows never disagree.
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
