import { isOperationTotals } from '@/lib/games/operation-totals';
import { maintainedHiddenBoard } from '@/lib/games/play-settings-constraint';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
  PlaySettingsChangeEntry,
} from '@/lib/games/saved-game-types';
import { startedFromStandardPosition } from '@/lib/games/standard-start';

/** The published-game columns the hidden-board qualification reads. */
export type HiddenBoardWinRow = {
  playSettings: GamePlaySettings | null;
  playSettingsLog: PlaySettingsChangeEntry[] | null;
  operationLogs: MoveOperationLog[] | null;
  operationTotals: OperationTotals | null;
  startingFen: string | null;
  setupPlies: number | null;
};

/**
 * Does one won, published game count toward the 1dan hidden-board
 * requirement?
 *
 * Fail-closed throughout: malformed or unverifiable data disqualifies the
 * game rather than crashing or passing. A crash would take down
 * `checkAndGrantRanks` for every future trigger for that user (the error is
 * swallowed and only reaches Sentry), permanently blocking promotion;
 * leniency would promote on logs that cannot be verified.
 *
 * The rules, in order:
 *
 * 1. The game must start from the standard initial position — otherwise a
 *    "board hidden throughout" win is meaningless (start one move from mate
 *    and play it). See {@link startedFromStandardPosition}.
 * 2. The board must have stayed hidden for the whole game, settings log
 *    included. See {@link maintainedHiddenBoard}.
 * 3. Peeks must be within `maxPeeks`, counted from the monotonic lifetime
 *    totals when present: undo cannot shrink those, so peek → undo → replay
 *    still counts every peek.
 * 4. On rows published before `operation_totals` existed, only the per-move
 *    log survives — and undo deleted log lines together with their
 *    `peekCount`. Any recorded undo therefore makes the peek total
 *    unverifiable, and the game is rejected.
 *
 * Lives outside the evaluator registry because this is the highest-stakes
 * reward rule in the app: as an anonymous `filter` callback inside a
 * DB-backed evaluator, none of its branches could be reached without
 * feeding rows through a stubbed database module.
 */
export function qualifiesAsHiddenBoardWin(row: HiddenBoardWinRow, maxPeeks: number): boolean {
  if (!startedFromStandardPosition(row.startingFen, row.setupPlies)) return false;
  if (!maintainedHiddenBoard(row.playSettings, row.playSettingsLog)) return false;

  if (row.operationTotals != null) {
    if (!isOperationTotals(row.operationTotals)) return false;
    return row.operationTotals.peeks <= maxPeeks;
  }

  let peeks = 0;
  let undos = 0;
  for (const log of row.operationLogs ?? []) {
    if (typeof log?.peekCount !== 'number' || Number.isNaN(log.peekCount)) return false;
    if (typeof log?.undoCount !== 'number' || Number.isNaN(log.undoCount)) return false;
    peeks += log.peekCount;
    undos += log.undoCount;
  }
  return undos === 0 && peeks <= maxPeeks;
}
