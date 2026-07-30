import type { MoveOperationLog, UndoneMoveLog } from './saved-game-types';
import { MAX_UNDONE_LOGS, isUndoneMoveLog } from './undone-logs';

/**
 * Bounding of the self-reported aid-usage records on the publish path, before
 * they become public data.
 *
 * These carry the opposite failure policy from the rest of
 * {@link validatePublishSnapshot}: the game's identity (title, moves, result,
 * engine, move legality) is an integrity boundary and a bad value REJECTS the
 * publish, whereas everything here is display / audit metadata that the client
 * reports about itself — a malformed blob is dropped to `null` and the game
 * still publishes without it. `computeGameStats` and the replay surfaces read
 * these fields defensively for exactly that reason.
 *
 * What is enforced is *size*, not truth: the numeric counters are trusted
 * as-is, but the free-text SAN fields (`invalidAttempts`, `UndoneMoveLog.sans`)
 * and their square companions are re-bounded server-side so a crafted payload
 * cannot bloat a public row. The client caps them too; this is the backstop.
 *
 * The two exported sanitizers live together because they share that bounding —
 * an archived {@link UndoneMoveLog} embeds a {@link MoveOperationLog}, so the
 * same attempt/square caps apply on both paths.
 */

// Bounds for the self-reported `invalidAttempts` move texts: at most this many
// per move, each clipped to a SAN-sized length (the longest real SAN, e.g.
// "exd8=Q+", is well under this).
export const MAX_INVALID_ATTEMPTS = 20;
export const MAX_INVALID_ATTEMPT_LEN = 12;

// Bounds for an archived undo's retracted SAN(s): only the player's move and
// the AI's reply are ever recorded (see UndoneMoveLog.sans), and real SAN tops
// out around "exd8=Q#" (7 chars) — 10 leaves headroom without inviting abuse.
export const MAX_SANS_PER_UNDO = 2;
export const MAX_SAN_LEN = 10;

const ALGEBRAIC_SQUARE_RE = /^[a-h][1-8]$/;

/** Shape guard for one `invalidAttemptSquares` slot's `{ from, to }` object. */
function isAlgebraicSquarePair(value: unknown): value is { from: string; to: string } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.from === 'string' &&
    ALGEBRAIC_SQUARE_RE.test(v.from) &&
    typeof v.to === 'string' &&
    ALGEBRAIC_SQUARE_RE.test(v.to)
  );
}

/**
 * Cap an attempt list by count and clip each entry to a SAN-sized length.
 * Returns `undefined` for an absent / empty list so the field is omitted rather
 * than persisted as `[]`.
 */
function boundAttempts(attempts: readonly string[] | undefined): string[] | undefined {
  if (!attempts || attempts.length === 0) return undefined;
  return attempts.slice(0, MAX_INVALID_ATTEMPTS).map((s) => s.slice(0, MAX_INVALID_ATTEMPT_LEN));
}

/**
 * Cap a square-companion list by count, dropping it entirely when every slot is
 * null (nothing to mark on a board).
 */
function boundSquares(
  squares: readonly ({ from: string; to: string } | null)[] | undefined
): ({ from: string; to: string } | null)[] | undefined {
  if (!squares || squares.length === 0) return undefined;
  const bounded = squares.slice(0, MAX_INVALID_ATTEMPTS);
  return bounded.some((s) => s !== null) ? bounded : undefined;
}

/**
 * Bound the self-reported per-move operation logs. Accepts an array no longer
 * than the move list, else drops the whole thing to null.
 *
 * A log with neither attempt field is passed through untouched — the numeric
 * counters need no bounding, and rebuilding the object would only churn.
 * Unlike {@link sanitizeUndoneLogs}, each square slot is re-validated against
 * the algebraic-square shape here, because nothing upstream has type-guarded
 * this path (the undone-logs path goes through `isUndoneMoveLog` first).
 */
export function sanitizeOperationLogs(raw: unknown, moveCount: number): MoveOperationLog[] | null {
  if (!Array.isArray(raw) || raw.length > moveCount) return null;

  return (raw as MoveOperationLog[]).map((log) => {
    if (!log || typeof log !== 'object') return log;
    const rawAttempts = (log as { invalidAttempts?: unknown }).invalidAttempts;
    const rawSquares = (log as { invalidAttemptSquares?: unknown }).invalidAttemptSquares;
    if (!Array.isArray(rawAttempts) && !Array.isArray(rawSquares)) return log;

    const attempts = Array.isArray(rawAttempts)
      ? boundAttempts(rawAttempts.filter((s): s is string => typeof s === 'string'))
      : undefined;
    // Best-effort only: a crafted payload could already misalign this against
    // `attempts` above (e.g. by mixing non-string junk into invalidAttempts
    // before the filter runs). That's display metadata, not an integrity
    // boundary — worst case a self-authored GIF marks the wrong square.
    // Sliced before mapping so a crafted payload with a huge square list costs
    // 20 shape checks rather than one per submitted element.
    const squares = Array.isArray(rawSquares)
      ? boundSquares(
          rawSquares
            .slice(0, MAX_INVALID_ATTEMPTS)
            .map((s) =>
              s === null ? null : isAlgebraicSquarePair(s) ? { from: s.from, to: s.to } : null
            )
        )
      : undefined;

    return { ...log, invalidAttempts: attempts, invalidAttemptSquares: squares };
  });
}

/**
 * Bound the archived rollback discards. Requires every entry to pass
 * {@link isUndoneMoveLog}; one malformed entry drops the whole list to null
 * (an entry is only meaningful next to the others in its timeline).
 *
 * Whitelist-copied per entry so no extra keys reach the DB, and the entry count
 * is re-capped at {@link MAX_UNDONE_LOGS}.
 */
export function sanitizeUndoneLogs(raw: unknown): UndoneMoveLog[] | null {
  if (!Array.isArray(raw) || !raw.every((entry) => isUndoneMoveLog(entry))) return null;

  const bounded = (raw as UndoneMoveLog[]).slice(0, MAX_UNDONE_LOGS).map((entry) => {
    const out: UndoneMoveLog = { index: entry.index };
    if (entry.log !== undefined) {
      out.log = {
        inputMethod: entry.log.inputMethod,
        peekCount: entry.log.peekCount,
        undoCount: entry.log.undoCount,
        movePeekCount: entry.log.movePeekCount,
        invalidCount: entry.log.invalidCount,
        invalidAttempts: boundAttempts(entry.log.invalidAttempts),
        invalidAttemptSquares: boundSquares(entry.log.invalidAttemptSquares),
      };
    }
    const pending = boundAttempts(entry.pendingInvalidAttempts);
    if (pending) out.pendingInvalidAttempts = pending;
    if (entry.sans && entry.sans.length > 0) {
      out.sans = entry.sans.slice(0, MAX_SANS_PER_UNDO).map((s) => s.slice(0, MAX_SAN_LEN));
    }
    return out;
  });

  return bounded.length > 0 ? bounded : null;
}
