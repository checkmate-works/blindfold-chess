import type { PuzzleSolutionMove } from "@blindfold-chess/features/puzzle";

import { callMobileApi } from "../../auth/api-client";

export type PuzzleSummary = { id: string; title: string; fen: string };

export type Puzzle = PuzzleSummary & {
  description: string | null;
  solutions: PuzzleSolutionMove[][];
};

// A 2xx is not proof of a JSON body from our API: a captive portal or a
// proxy can answer with an HTML page and a 200. So every body below is read
// with `response.json().catch(() => undefined)` and checked for the fields
// the screens use; anything else becomes "failed". Letting `json()` reject
// instead would leave the caller's promise unhandled — the screens have no
// `.catch`, so the list's pull-to-refresh spinner would never stop.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSummary(v: unknown): v is PuzzleSummary {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.fen === "string"
  );
}

function isSolutionMove(v: unknown): v is PuzzleSolutionMove {
  return (
    isRecord(v) &&
    typeof v.san === "string" &&
    (v.note === null || typeof v.note === "string")
  );
}

function isPuzzle(v: unknown): v is Puzzle {
  return (
    isRecord(v) &&
    (v.description === null || typeof v.description === "string") &&
    Array.isArray(v.solutions) &&
    v.solutions.every(
      (line: unknown) => Array.isArray(line) && line.every(isSolutionMove),
    ) &&
    isSummary(v)
  );
}

/**
 * The Daily Puzzle and the featured puzzles (`GET /puzzles`, public).
 *
 * Never rejects. "failed" covers a request that did not reach the server, a
 * non-2xx, and a 2xx whose body is not JSON, has no `featured` array, or has
 * a `daily` that is neither null nor a puzzle summary. Featured entries
 * missing a field are dropped rather than failing the whole list.
 */
export async function fetchPuzzleList(): Promise<
  { daily: PuzzleSummary | null; featured: PuzzleSummary[] } | "failed"
> {
  const response = await callMobileApi("/puzzles", { anonymous: true });
  if (typeof response === "string" || !response.ok) return "failed";
  const body: unknown = await response.json().catch(() => undefined);
  if (!isRecord(body) || !Array.isArray(body.featured)) return "failed";
  const daily = body.daily ?? null;
  if (daily !== null && !isSummary(daily)) return "failed";
  return { daily, featured: body.featured.filter(isSummary) };
}

/**
 * One featured puzzle with its solution lines; "notFound" if it is not one.
 *
 * Never rejects. "failed" covers a request that did not reach the server, a
 * non-2xx other than 404, and a 2xx whose body is not JSON or lacks a field
 * the puzzle screen reads (id, title, fen, description, and every solution
 * move's san and note).
 */
export async function fetchPuzzle(
  id: string,
): Promise<Puzzle | "notFound" | "failed"> {
  const response = await callMobileApi(`/puzzles/${encodeURIComponent(id)}`, {
    anonymous: true,
  });
  if (typeof response === "string") return "failed";
  if (response.status === 404) return "notFound";
  if (!response.ok) return "failed";
  const body: unknown = await response.json().catch(() => undefined);
  return isPuzzle(body) ? body : "failed";
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
