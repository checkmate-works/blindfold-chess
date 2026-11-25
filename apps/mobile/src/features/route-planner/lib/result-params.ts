import {
  getShortestPathOrEmpty,
  type RoutePlannerProblem,
  type RoutePlannerProblemResult,
  type RoutePlannerResult,
} from "@blindfold-chess/features/route-planner";

import {
  serializePracticeStatsParams,
  type PracticeStatsParams,
} from "../../../lib/practice-result-params";

/** What the challenge hands its result screen: the stats and the problems. */
export type RoutePlannerResultParams = Required<PracticeStatsParams> & {
  /** `RoutePlannerProblemResult[]` as JSON. */
  problems: string;
};

/**
 * The result screen's params for a finished challenge. The score is the
 * session's, over the answered problems only; `timedOutProblem` (the one on
 * screen when the clock ran out) is added to the list after them, with its
 * shortest route, so the result can show its answer as the web's does, but
 * it counts in no stat. The average is the time per answer, as on the web.
 */
export function buildRoutePlannerResultParams(
  result: RoutePlannerResult,
  {
    timeElapsed,
    timeLimit,
    timedOutProblem,
  }: {
    timeElapsed: number;
    timeLimit: number;
    timedOutProblem: RoutePlannerProblem | null;
  },
): RoutePlannerResultParams {
  const timeTaken = Math.min(timeElapsed, timeLimit);
  const total = result.totalProblems;
  const problems: RoutePlannerProblemResult[] = timedOutProblem
    ? [
        ...result.problems,
        {
          piece: timedOutProblem.piece,
          start: timedOutProblem.start,
          end: timedOutProblem.end,
          success: false,
          userPath: [],
          shortestPath: getShortestPathOrEmpty(
            timedOutProblem.piece,
            timedOutProblem.start,
            timedOutProblem.end,
          ),
          timedOut: true,
        },
      ]
    : result.problems;

  return {
    ...serializePracticeStatsParams({
      correctAnswers: result.correctCount,
      incorrectAnswers: total - result.correctCount,
      totalQuestions: total,
      accuracy: result.accuracy,
      timeTaken,
      averageTime: total > 0 ? timeTaken / total : 0,
    }),
    problems: JSON.stringify(problems),
  };
}

/**
 * The problem list back from the params; anything that is not a JSON
 * array (a deep link without it, a mangled one) is an empty list.
 */
export function parseRoutePlannerProblems(
  raw: string | undefined,
): RoutePlannerProblemResult[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RoutePlannerProblemResult[]) : [];
  } catch {
    return [];
  }
}
