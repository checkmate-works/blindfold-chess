import type { PuzzleSolutionMove } from "@blindfold-chess/features/puzzle";

import { callMobileApi } from "../../auth/api-client";

export type PuzzleSummary = { id: string; title: string; fen: string };

export type Puzzle = PuzzleSummary & {
  description: string | null;
  solutions: PuzzleSolutionMove[][];
};

/** The Daily Puzzle and the featured puzzles (`GET /puzzles`, public). */
export async function fetchPuzzleList(): Promise<
  { daily: PuzzleSummary | null; featured: PuzzleSummary[] } | "failed"
> {
  const response = await callMobileApi("/puzzles", { anonymous: true });
  if (typeof response === "string" || !response.ok) return "failed";
  return (await response.json()) as {
    daily: PuzzleSummary | null;
    featured: PuzzleSummary[];
  };
}

/** One featured puzzle with its solution lines; "notFound" if it is not one. */
export async function fetchPuzzle(
  id: string,
): Promise<Puzzle | "notFound" | "failed"> {
  const response = await callMobileApi(`/puzzles/${encodeURIComponent(id)}`, {
    anonymous: true,
  });
  if (typeof response === "string") return "failed";
  if (response.status === 404) return "notFound";
  if (!response.ok) return "failed";
  return (await response.json()) as Puzzle;
}

/**
 * Records a solved puzzle for the signed-in user (free-play EXP, as on the
 * web). Returns false when nothing was recorded (signed out, offline).
 */
export async function savePuzzleResult(input: {
  playerMoveCount: number;
  incorrectAttempts: number;
  peekCount: number;
}): Promise<boolean> {
  const response = await callMobileApi("/puzzles/results", {
    method: "POST",
    body: input,
  });
  return typeof response !== "string" && response.ok;
}
