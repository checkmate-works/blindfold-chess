/**
 * Serialization helpers for position-memory session results.
 *
 * Results and aggregate stats are passed from the session page to the
 * result page as JSON-encoded URL parameters, so we keep the payload
 * compact by using single-character field names.
 *
 * Field legend (SerializedResultItem):
 *   f = fen, r = recreatedFen, b = isBlackToMove (0/1),
 *   a = accuracy, c = correctPieces, t = totalPieces,
 *   i = incorrectPieces, m = missingPieces, e = extraPieces,
 *   o = originalIndex, s = skipped (0/1)
 *
 * Field legend (SerializedStats):
 *   c = totalCorrectPieces, t = totalPieces, i = totalIncorrectPieces,
 *   m = totalMissingPieces, e = totalExtraPieces,
 *   k = totalMistakes (sum of i + m + e across submitted problems — used
 *       as the EXP accuracy-bonus tier input). Optional for backward
 *       compatibility with older URLs; parser defaults it to 0.
 */

export interface SerializedResultItem {
  f: string;
  r: string;
  b: number;
  a: number;
  c: number;
  t: number;
  i: number;
  m: number;
  e: number;
  o: number;
  s: number;
}

export interface SerializedStats {
  c: number;
  t: number;
  i: number;
  m: number;
  e: number;
  /** Total player mistakes (optional; defaults to 0 on legacy payloads). */
  k?: number;
}

/**
 * Payload handed from the session view/hook to a wrapper when the XState
 * machine enters `sessionResult`. Wrappers use it to build the result-page
 * URL and redirect.
 */
export type SessionCompletePayload = {
  results: SerializedResultItem[];
  stats: SerializedStats;
  totalAccuracy: number;
};

export interface ParsedResultItem {
  fen: string;
  recreatedFen: string;
  isBlackToMove: boolean;
  accuracy: number;
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  originalIndex: number;
  skipped: boolean;
}

export interface ParsedStats {
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  /**
   * Total player mistakes across submitted problems (sum of incorrect +
   * missing + extra). Defaults to 0 when absent from the payload
   * (backward compat with pre-mistakes-tracking URLs).
   */
  mistakes: number;
}

export type ProblemResultContext = {
  accuracy: number;
  correctPieces: number;
  totalPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
};

/**
 * Build the per-problem serialized result list from the XState machine's
 * per-problem results map and the session's ordered positions.
 *
 * Problems missing from `problemResults` (either skipped or never reached)
 * are emitted with zeroed counts and `s: 1`.
 */
export function buildSerializedResults(args: {
  positions: { fen: string; isBlackToMove: boolean }[];
  problemResults: Map<number, ProblemResultContext>;
  recreatedPositions: Map<number, string>;
  skippedProblems: Set<number>;
}): SerializedResultItem[] {
  const { positions, problemResults, recreatedPositions, skippedProblems } = args;
  return positions.map((position, index) => {
    const result = problemResults.get(index);
    const isSkipped = skippedProblems.has(index) || !result;
    return {
      f: position.fen,
      r: recreatedPositions.get(index) || '',
      b: position.isBlackToMove ? 1 : 0,
      a: result?.accuracy ?? 0,
      c: result?.correctPieces ?? 0,
      t: result?.totalPieces ?? 0,
      i: result?.incorrectPieces ?? 0,
      m: result?.missingPieces ?? 0,
      e: result?.extraPieces ?? 0,
      o: index,
      s: isSkipped ? 1 : 0,
    };
  });
}

export function serializeResults(items: SerializedResultItem[]): string {
  return encodeURIComponent(JSON.stringify(items));
}

export function serializeStats(stats: SerializedStats): string {
  return encodeURIComponent(JSON.stringify(stats));
}

export function parseResults(dataParam: string | null): ParsedResultItem[] {
  if (!dataParam) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(dataParam));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: SerializedResultItem) => ({
      fen: item.f,
      recreatedFen: item.r,
      isBlackToMove: item.b === 1,
      accuracy: item.a,
      correctPieces: item.c,
      totalPieces: item.t,
      incorrectPieces: item.i,
      missingPieces: item.m,
      extraPieces: item.e,
      originalIndex: item.o,
      skipped: item.s === 1,
    }));
  } catch {
    return [];
  }
}

export function parseStats(statsParam: string | null): ParsedStats | null {
  if (!statsParam) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(statsParam)) as SerializedStats;
    return {
      correctPieces: parsed.c,
      totalPieces: parsed.t,
      incorrectPieces: parsed.i,
      missingPieces: parsed.m,
      extraPieces: parsed.e,
      mistakes: parsed.k ?? 0,
    };
  } catch {
    return null;
  }
}
