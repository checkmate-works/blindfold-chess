import type { MoveOperationLog, UndoneMoveLog } from './saved-game-types';

/**
 * Per-game cap on archived {@link UndoneMoveLog} records. Beyond it new
 * discards stop being archived (earliest kept) while `operationTotals`
 * keeps counting — same earliest-first posture as the per-move
 * `invalidAttempts` cap.
 */
export const MAX_UNDONE_LOGS = 50;

const INPUT_METHODS = ['text', 'text-autocomplete', 'select', 'button', 'board'];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((s) => typeof s === 'string');
}

/** Shape guard for an archived entry's embedded per-move log. */
function isArchivedMoveLog(value: unknown): value is MoveOperationLog {
  if (typeof value !== 'object' || value === null) return false;
  const l = value as Record<string, unknown>;
  return (
    INPUT_METHODS.includes(l.inputMethod as string) &&
    typeof l.peekCount === 'number' &&
    typeof l.undoCount === 'number' &&
    (l.movePeekCount === undefined || typeof l.movePeekCount === 'number') &&
    (l.invalidCount === undefined || typeof l.invalidCount === 'number') &&
    (l.invalidAttempts === undefined || isStringArray(l.invalidAttempts))
  );
}

/**
 * Shape guard for {@link UndoneMoveLog} as read from untrusted places
 * (localStorage records, the publish payload). A record must carry at least
 * one of `log` / `pendingInvalidAttempts` — an index alone records nothing.
 */
export function isUndoneMoveLog(value: unknown): value is UndoneMoveLog {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.index !== 'number' || !Number.isInteger(v.index) || v.index < 0) return false;
  if (v.log === undefined && v.pendingInvalidAttempts === undefined) return false;
  if (v.log !== undefined && !isArchivedMoveLog(v.log)) return false;
  if (v.pendingInvalidAttempts !== undefined && !isStringArray(v.pendingInvalidAttempts)) {
    return false;
  }
  return true;
}
