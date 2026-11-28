import type { PositionAccuracy } from "../common/accuracy";
import { isJsonObject, parseEncodedJson } from "../common/encoded-json";
import {
  isBoolean,
  isFiniteNumber,
  isString,
  pickValidFields,
} from "../common/pick-valid-fields";
import { aggregateResults, type AggregatedStats } from "./aggregate-results";
import type { FenPosition } from "./problems";

/**
 * The payload the FEN session hands its result page in the `data` param.
 * Every field is optional: a field that is missing or malformed is dropped,
 * and the result page falls back to its own default for it.
 */
export type FenResultData = {
  score?: number;
  total?: number;
  detailedStats?: FenDetailedStats;
  results?: FenProblemResultEntry[];
};

/**
 * Decode the result payload carried between the FEN session and result page.
 *
 * The payload arrives through the URL, so its shape is checked rather than
 * assumed: a hand-edited or truncated link must fall back to the defaults, not
 * reach the result list and throw while it renders. Each top-level field is
 * judged on its own, and a malformed entry of `results` is dropped while the
 * well-formed ones are kept.
 *
 * @returns `null` when the param is absent, does not decode, or is not an
 * object.
 */
export function parseFenResultData(
  dataParam: string | null,
): FenResultData | null {
  const parsed = parseEncodedJson(dataParam);
  if (!isJsonObject(parsed)) return null;

  const data: FenResultData = pickValidFields<Omit<FenResultData, "results">>(
    parsed,
    {
      score: isFiniteNumber,
      total: isFiniteNumber,
      detailedStats: isFenDetailedStats,
    },
  );
  if (Array.isArray(parsed.results)) {
    data.results = parsed.results.filter(isFenProblemResultEntry);
  }
  return data;
}

const DETAILED_STATS_FIELDS = [
  "correctPieces",
  "totalPieces",
  "incorrectPieces",
  "missingPieces",
  "extraPieces",
] as const;

function isFenDetailedStats(value: unknown): value is FenDetailedStats {
  return (
    isJsonObject(value) &&
    DETAILED_STATS_FIELDS.every((field) => isFiniteNumber(value[field]))
  );
}

const ENTRY_NUMBER_FIELDS = [
  "accuracy",
  ...DETAILED_STATS_FIELDS,
  "originalIndex",
] as const;

/**
 * Whether a decoded value has the shape of one result entry. The FENs are
 * only checked to be strings: the result board already falls back to an
 * empty board on a FEN it cannot read, and a stricter check would drop
 * entries the session wrote itself.
 */
function isFenProblemResultEntry(
  value: unknown,
): value is FenProblemResultEntry {
  return (
    isJsonObject(value) &&
    isString(value.fen) &&
    isString(value.recreatedFen) &&
    isBoolean(value.isBlackToMove) &&
    isBoolean(value.skipped) &&
    ENTRY_NUMBER_FIELDS.every((field) => isFiniteNumber(value[field]))
  );
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
