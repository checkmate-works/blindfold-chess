import {
  isJsonObject,
  isString,
  isValidSquare,
  parseEncodedJson,
} from '@blindfold-chess/features/common';
import type { DiagonalQuestionResult } from '@blindfold-chess/features/diagonal-quiz';

/**
 * The question list the challenge hands its result page in the `data` param,
 * with minified keys: s = square, c = isCorrect, dc = isDiagonalCorrect,
 * ac = isAntiDiagonalCorrect, cd = correctDiagonal, ca = correctAntiDiagonal,
 * ud = userDiagonal, ua = userAntiDiagonal, t = timedOut (present only on the
 * question the time limit cut off). The flags are written as 1 / 0.
 *
 * The param arrives through the URL, so anything can be in it: a value that
 * is not a JSON array is an empty list, and an entry without a valid square
 * and both correct diagonals is dropped rather than rendered — the result
 * board is drawn from the square, and a non-string field would be handed to
 * React as a child and throw.
 */
export function parseDiagonalQuizResults(dataParam: string | null): DiagonalQuestionResult[] {
  const parsed = parseEncodedJson(dataParam);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item: unknown): DiagonalQuestionResult[] => {
    if (
      !isJsonObject(item) ||
      !isString(item.s) ||
      !isValidSquare(item.s) ||
      !isString(item.cd) ||
      !isString(item.ca)
    ) {
      return [];
    }
    return [
      {
        square: item.s,
        isCorrect: item.c === 1,
        isDiagonalCorrect: item.dc === 1,
        isAntiDiagonalCorrect: item.ac === 1,
        correctDiagonal: item.cd,
        correctAntiDiagonal: item.ca,
        ...(isString(item.ud) ? { userDiagonal: item.ud } : {}),
        ...(isString(item.ua) ? { userAntiDiagonal: item.ua } : {}),
        ...(item.t === 1 ? { timedOut: true } : {}),
      },
    ];
  });
}
