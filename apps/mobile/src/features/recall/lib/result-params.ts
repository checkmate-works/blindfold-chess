import type { MoveLogEntry } from "@blindfold-chess/features/recall";

const STATUSES: readonly MoveLogEntry["status"][] = [
  "correct",
  "incorrect",
  "auto",
  "skipped",
  "autoFilled",
];

/** The session's move log as the result screen's `log` route param. */
export function encodeRecallLog(log: readonly MoveLogEntry[]): string {
  return JSON.stringify(log);
}

function isEntry(v: unknown): v is MoveLogEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.moveNumber === "number" &&
    typeof e.isWhiteMove === "boolean" &&
    typeof e.move === "string" &&
    STATUSES.includes(e.status as MoveLogEntry["status"]) &&
    (e.incorrectMove === undefined || typeof e.incorrectMove === "string")
  );
}

/**
 * Reads the `log` param back. Anything that is not a list of log entries
 * (an old link, a hand-edited URL) reads as an empty log, which the result
 * screen shows as a review with nothing in it rather than crashing.
 */
export function decodeRecallLog(param: string | undefined): MoveLogEntry[] {
  if (!param) return [];
  try {
    const parsed: unknown = JSON.parse(param);
    return Array.isArray(parsed) && parsed.every(isEntry) ? parsed : [];
  } catch {
    return [];
  }
}
