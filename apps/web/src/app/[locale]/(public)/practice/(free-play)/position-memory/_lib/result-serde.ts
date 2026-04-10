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
}

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
    };
  } catch {
    return null;
  }
}
