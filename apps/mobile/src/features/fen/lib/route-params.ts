import { validateFenFormat } from "@blindfold-chess/features/chess-core/fen";
import type {
  FenProblemResultEntry,
  FenSessionSummary,
} from "@blindfold-chess/features/fen-practice";

import { parseIntParam } from "../../../lib/route-params";

/** Search params the setup screen hands the session screen. */
export type FenSessionParams = {
  /** JSON array of FEN strings, in the order the setup listed them. */
  problems?: string;
  count?: string;
  /** `"1"` to shuffle, anything else keeps the order. */
  shuffle?: string;
};

export function serializeFenSessionParams({
  fens,
  problemCount,
  shuffle,
}: {
  fens: readonly string[];
  problemCount: number;
  shuffle: boolean;
}): Record<keyof FenSessionParams, string> {
  return {
    problems: JSON.stringify(fens),
    count: String(Math.min(problemCount, fens.length)),
    shuffle: shuffle ? "1" : "0",
  };
}

/**
 * The `from` value of a session opened from a guide's link card. The
 * session hands it on to its result, which then leads back to the guide.
 */
export const FROM_GUIDE = "guide";

/**
 * The session params for a guide's problem: just that problem, in order,
 * marked `from=guide`. The guide's link card opens the session with them,
 * and the result's "Play again" replays the problem with the same.
 * `seconds` sets the memorization clock (position memory's `seconds` param);
 * left out, the session uses its default.
 */
export function guideProblemSessionParams(
  fens: readonly string[],
  seconds?: string,
): Record<keyof FenSessionParams | "from", string> & { seconds?: string } {
  return {
    ...serializeFenSessionParams({ fens, problemCount: 1, shuffle: false }),
    from: FROM_GUIDE,
    ...(seconds ? { seconds } : {}),
  };
}

/**
 * Read the session params back. A deep link can carry anything, so entries
 * that are not well-formed FENs are dropped, and an unreadable list comes
 * back empty — the session then falls back to the built-in problems.
 */
export function parseFenSessionParams(params: FenSessionParams): {
  fens: string[];
  problemCount: number;
  shuffle: boolean;
} {
  let fens: string[] = [];
  if (params.problems) {
    try {
      const parsed: unknown = JSON.parse(params.problems);
      if (Array.isArray(parsed)) {
        fens = parsed.filter(
          (fen): fen is string =>
            typeof fen === "string" && validateFenFormat(fen),
        );
      }
    } catch {
      fens = [];
    }
  }

  return {
    fens,
    problemCount: parseIntParam(params.count, {
      min: 1,
      fallback: fens.length > 0 ? fens.length : 5,
    }),
    shuffle: params.shuffle === "1",
  };
}

/** Search params the session screen hands the result screen. */
export type FenResultParams = {
  /** Average accuracy over submitted problems, one decimal. */
  accuracy?: string;
  correct?: string;
  totalPieces?: string;
  incorrect?: string;
  missing?: string;
  extra?: string;
  /** Problems the player submitted. */
  solved?: string;
  /** Problems in the session, submitted or not. */
  problems?: string;
  /** `FenProblemResultEntry[]` as JSON, one per problem in session order. */
  results?: string;
};

export type FenResult = {
  accuracy: number;
  correct: number;
  totalPieces: number;
  incorrect: number;
  missing: number;
  extra: number;
  solved: number;
  problems: number;
  results: FenProblemResultEntry[];
};

export function serializeFenResultParams(
  summary: FenSessionSummary,
  problemCount: number,
): Record<keyof FenResultParams, string> {
  const { aggregated } = summary;
  const solved = summary.results.filter((r) => !r.skipped).length;
  return {
    accuracy: aggregated.totalAccuracy.toFixed(1),
    correct: String(aggregated.totalCorrect),
    totalPieces: String(aggregated.totalPieces),
    incorrect: String(aggregated.totalIncorrect),
    missing: String(aggregated.totalMissing),
    extra: String(aggregated.totalExtra),
    solved: String(solved),
    problems: String(problemCount),
    results: JSON.stringify(summary.results),
  };
}

export function parseFenResultParams(params: FenResultParams): FenResult {
  const accuracy = Number(params.accuracy);
  const int = (value: string | undefined) =>
    parseIntParam(value, { min: 0, fallback: 0 });
  return {
    accuracy:
      Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100
        ? accuracy
        : 0,
    correct: int(params.correct),
    totalPieces: int(params.totalPieces),
    incorrect: int(params.incorrect),
    missing: int(params.missing),
    extra: int(params.extra),
    solved: int(params.solved),
    problems: int(params.problems),
    results: parseProblemResults(params.results),
  };
}

const COUNT_FIELDS = [
  "accuracy",
  "correctPieces",
  "totalPieces",
  "incorrectPieces",
  "missingPieces",
  "extraPieces",
  "originalIndex",
] as const;

/**
 * The per-problem list back from its JSON. Like the session params, a deep
 * link can carry anything: an entry whose FEN is not well formed or whose
 * counts are not non-negative numbers is dropped rather than drawn, and an
 * unreadable list is empty.
 */
function parseProblemResults(
  json: string | undefined,
): FenProblemResultEntry[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isProblemResultEntry);
}

function isProblemResultEntry(value: unknown): value is FenProblemResultEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.fen === "string" &&
    validateFenFormat(entry.fen) &&
    typeof entry.recreatedFen === "string" &&
    (entry.recreatedFen === "" || validateFenFormat(entry.recreatedFen)) &&
    typeof entry.isBlackToMove === "boolean" &&
    typeof entry.skipped === "boolean" &&
    COUNT_FIELDS.every(
      (field) =>
        typeof entry[field] === "number" &&
        Number.isFinite(entry[field]) &&
        entry[field] >= 0,
    )
  );
}
