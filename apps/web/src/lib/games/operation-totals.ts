import type { MoveOperationLog, OperationTotals } from './saved-game-types';

/** The all-zero totals a brand-new game starts from. Spread, never mutate. */
export const EMPTY_OPERATION_TOTALS: OperationTotals = {
  peeks: 0,
  movePeeks: 0,
  undos: 0,
  invalidMoves: 0,
};

/**
 * Shape guard for {@link OperationTotals} as read from untrusted places
 * (localStorage records, the publish payload, `games.operation_totals`).
 * Every counter must be a non-negative integer — `Number.isInteger` also
 * rejects NaN/Infinity, so a malformed blob never passes.
 */
export function isOperationTotals(value: unknown): value is OperationTotals {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (['peeks', 'movePeeks', 'undos', 'invalidMoves'] as const).every(
    (key) => typeof v[key] === 'number' && Number.isInteger(v[key]) && (v[key] as number) >= 0
  );
}

/**
 * Best-effort baseline totals for a game recorded before `operationTotals`
 * existed: sum the per-move log counters that survived. Lossy by nature —
 * anything undo already erased is gone — but it lets an in-progress legacy
 * game resume with totals at least as large as its visible log, so the
 * counters stay monotonic from here on.
 */
export function sumOperationLogs(logs: MoveOperationLog[]): OperationTotals {
  const totals = { ...EMPTY_OPERATION_TOTALS };
  for (const log of logs) {
    totals.peeks += typeof log?.peekCount === 'number' ? log.peekCount : 0;
    totals.movePeeks += typeof log?.movePeekCount === 'number' ? log.movePeekCount : 0;
    totals.undos += typeof log?.undoCount === 'number' ? log.undoCount : 0;
    totals.invalidMoves += typeof log?.invalidCount === 'number' ? log.invalidCount : 0;
  }
  return totals;
}
