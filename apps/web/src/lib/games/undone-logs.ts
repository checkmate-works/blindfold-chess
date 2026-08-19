import { isMoveOperationLog, isStringArray } from './move-operation-log';
import type { UndoneMoveLog } from './saved-game-types';

/**
 * Per-game cap on archived {@link UndoneMoveLog} records. Beyond it new
 * discards stop being archived (earliest kept) while `operationTotals`
 * keeps counting — same earliest-first posture as the per-move
 * `invalidAttempts` cap.
 */
export const MAX_UNDONE_LOGS = 50;

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
  if (v.log !== undefined && !isMoveOperationLog(v.log)) return false;
  if (v.pendingInvalidAttempts !== undefined && !isStringArray(v.pendingInvalidAttempts)) {
    return false;
  }
  if (v.sans !== undefined && !isStringArray(v.sans)) return false;
  return true;
}
