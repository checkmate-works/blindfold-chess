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
export function parseFenResultData(dataParam: string | null): FenResultData | null {
  if (!dataParam) return null;

  try {
    return JSON.parse(decodeURIComponent(dataParam)) as FenResultData;
  } catch {
    return null;
  }
}
