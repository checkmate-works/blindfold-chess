import type { PositionAccuracy } from "../common/accuracy";
import { aggregateResults, type AggregatedStats } from "./aggregate-results";
import type { FenPosition } from "./problems";

export type FenResultData = {
  score?: number;
  total?: number;
  detailedStats?: {
    correct: number;
    incorrect: number;
    total: number;
  };
  results?: unknown[];
};

/** Decode the result payload carried between the FEN session and result page. */
export function parseFenResultData(
  dataParam: string | null,
): FenResultData | null {
  if (!dataParam) return null;

  try {
    return JSON.parse(decodeURIComponent(dataParam)) as FenResultData;
  } catch {
    return null;
  }
}

/** One problem of a finished session, as the result screens list it. */
export type FenProblemResultEntry = {
  fen: string;
  /** The player's board when they submitted, or `""` if never submitted. */
  recreatedFen: string;
  isBlackToMove: boolean;
  accuracy: number;
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  /** Index of the problem in the session's (possibly shuffled) order. */
  originalIndex: number;
  /** Skipped explicitly, or never reached because the player quit. */
  skipped: boolean;
};

/** Piece totals across every submitted problem of a session. */
export type FenDetailedStats = {
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
};

/** Everything a finished FEN session reports. */
export type FenSessionSummary = {
  /**
   * True when the player left before submitting or skipping anything; the
   * screens then show a zero score with no per-problem list.
   */
  empty: boolean;
  aggregated: AggregatedStats;
  /** `aggregated.totalAccuracy` rounded to a whole percentage. */
  score: number;
  results: FenProblemResultEntry[];
  detailedStats: FenDetailedStats | null;
};

/**
 * Summarise a session: one entry per position (a problem without a
 * submitted result counts as skipped, so quitting midway lists the rest as
 * skipped) and the piece totals over the submitted ones.
 */
export function summarizeFenSession({
  positions,
  problemResults,
  recreatedPositions,
  skippedProblems,
}: {
  positions: readonly FenPosition[];
  problemResults: ReadonlyMap<number, PositionAccuracy>;
  recreatedPositions: ReadonlyMap<number, string>;
  skippedProblems: ReadonlySet<number>;
}): FenSessionSummary {
  const resultsArray = Array.from(problemResults.values());
  const aggregated = aggregateResults(resultsArray);

  if (resultsArray.length === 0 && skippedProblems.size === 0) {
    return {
      empty: true,
      aggregated,
      score: 0,
      results: [],
      detailedStats: null,
    };
  }

  const results = positions.map((position, index) => {
    const result = problemResults.get(index);
    const isSkipped = skippedProblems.has(index) || !result;

    return {
      fen: position.fen,
      recreatedFen: recreatedPositions.get(index) || "",
      isBlackToMove: position.isBlackToMove,
      accuracy: result?.accuracy ?? 0,
      correctPieces: result?.correctPieces ?? 0,
      totalPieces: result?.totalPieces ?? 0,
      incorrectPieces: result?.incorrectPieces ?? 0,
      missingPieces: result?.missingPieces ?? 0,
      extraPieces: result?.extraPieces ?? 0,
      originalIndex: index,
      skipped: isSkipped,
    };
  });

  return {
    empty: false,
    aggregated,
    score: Math.round(aggregated.totalAccuracy),
    results,
    detailedStats: {
      correctPieces: aggregated.totalCorrect,
      totalPieces: aggregated.totalPieces,
      incorrectPieces: aggregated.totalIncorrect,
      missingPieces: aggregated.totalMissing,
      extraPieces: aggregated.totalExtra,
    },
  };
}
