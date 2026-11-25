import type { DiagonalQuestionResult } from "@blindfold-chess/features/diagonal-quiz";
import { isValidSquare } from "@blindfold-chess/features/common";

/**
 * One question in the result route's `data` param, with the web's
 * one- and two-letter keys so a run of 60 seconds stays a short string:
 * s square, c correct, dc/ac each diagonal correct, cd/ca the correct
 * diagonals, ud/ua the player's, t the question the time ran out on.
 */
type SerializedQuestion = {
  s: string;
  c: 0 | 1;
  dc: 0 | 1;
  ac: 0 | 1;
  cd: string;
  ca: string;
  ud?: string;
  ua?: string;
  t?: 1;
};

/** The session's per-question results as the result screen's `data` param. */
export function serializeQuestionResults(
  results: readonly DiagonalQuestionResult[],
): string {
  return JSON.stringify(
    results.map((r): SerializedQuestion => ({
      s: r.square,
      c: r.isCorrect ? 1 : 0,
      dc: r.isDiagonalCorrect ? 1 : 0,
      ac: r.isAntiDiagonalCorrect ? 1 : 0,
      cd: r.correctDiagonal,
      ca: r.correctAntiDiagonal,
      ...(r.userDiagonal ? { ud: r.userDiagonal } : {}),
      ...(r.userAntiDiagonal ? { ua: r.userAntiDiagonal } : {}),
      ...(r.timedOut ? { t: 1 as const } : {}),
    })),
  );
}

/**
 * The inverse of {@link serializeQuestionResults}. A missing or malformed
 * param gives an empty list, and an entry that is not a question (a hand-made
 * deep link) is dropped, so the screen shows what it can instead of failing.
 */
export function parseQuestionResults(
  data: string | undefined,
): DiagonalQuestionResult[] {
  if (!data) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item: unknown): DiagonalQuestionResult[] => {
    if (typeof item !== "object" || item === null) return [];
    const q = item as Partial<Record<keyof SerializedQuestion, unknown>>;
    if (
      typeof q.s !== "string" ||
      !isValidSquare(q.s) ||
      typeof q.cd !== "string" ||
      typeof q.ca !== "string"
    ) {
      return [];
    }
    return [
      {
        square: q.s,
        isCorrect: q.c === 1,
        isDiagonalCorrect: q.dc === 1,
        isAntiDiagonalCorrect: q.ac === 1,
        correctDiagonal: q.cd,
        correctAntiDiagonal: q.ca,
        ...(typeof q.ud === "string" ? { userDiagonal: q.ud } : {}),
        ...(typeof q.ua === "string" ? { userAntiDiagonal: q.ua } : {}),
        ...(q.t === 1 ? { timedOut: true as const } : {}),
      },
    ];
  });
}
