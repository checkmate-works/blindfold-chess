import type { ExpInfo } from "@blindfold-chess/features/exp";

import { callMobileApi } from "../../auth/api-client";

/** A finished AI game as reported for its Exp grant. */
export type AiGameResultReport = {
  /** The saved game's UUID: the server grants once per id. */
  gameId: string;
  result: "win" | "loss" | "draw";
  skillLevel: number;
  /** The player's own moves, one per operation log. */
  playerMoveCount: number;
  /** Those of them made with a peek or a takeback. */
  aidedMoveCount: number;
};

function isExpInfo(value: unknown): value is ExpInfo {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.earnedExp === "number" &&
    typeof v.totalExp === "number" &&
    typeof v.level === "number"
  );
}

/**
 * Reports a finished AI game for the signed-in player's Exp, as the web does
 * when a game ends. The server computes the amount from the report and is
 * idempotent on the game's id, so sending a game twice returns the first
 * grant. Returns null when nothing was granted or it could not be asked
 * (signed out, offline, a game with no moves).
 */
export async function saveAiGameResult(
  report: AiGameResultReport,
): Promise<ExpInfo | null> {
  const { skillLevel, ...rest } = report;
  const response = await callMobileApi("/games/results", {
    method: "POST",
    body: { ...rest, engine: { kind: "stockfish", skillLevel } },
  });
  if (typeof response === "string" || !response.ok) return null;
  const body: unknown = await response.json().catch(() => undefined);
  const exp = (body as { exp?: unknown } | undefined)?.exp;
  return isExpInfo(exp) ? exp : null;
}
