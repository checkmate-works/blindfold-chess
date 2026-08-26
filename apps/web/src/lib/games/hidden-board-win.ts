import { isOperationTotals } from '@/lib/games/operation-totals';
import { maintainedHiddenBoard } from '@/lib/games/play-settings-constraint';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
  PlaySettingsChangeEntry,
} from '@/lib/games/saved-game-types';
import { startedFromStandardPosition } from '@/lib/games/standard-start';

/**
 * Everything the hidden-board qualification reads about one won game.
 *
 * Widened past the shape of a `games` row on purpose: the same predicate is
 * run before the game is a row at all, over a finished game still sitting in
 * localStorage (`guest-promotion.ts`, the finish-modal pitch). Persisted
 * columns are `T | null`, the local `Game` object leaves the same fields
 * `undefined`, and its arrays are handed over `readonly` — so every field
 * accepts all three. Nothing here is mutated, and every read already treats
 * absent and null identically.
 */
export type HiddenBoardWinEvidence = {
  playSettings: GamePlaySettings | null | undefined;
  playSettingsLog: readonly PlaySettingsChangeEntry[] | null | undefined;
  operationLogs: readonly MoveOperationLog[] | null | undefined;
  operationTotals: OperationTotals | null | undefined;
  startingFen: string | null | undefined;
  setupPlies: number | null | undefined;
};

/**
 * Does one won game count toward the 1dan hidden-board requirement?
 *
 * The single copy of that rule. The server evaluator grades the published
 * row with it (`rank-evaluation.ts`, the authority on what is actually
 * granted) and the finish modal grades the still-local game with it
 * (`guest-promotion.ts`) so the pitch it shows a signed-out player cannot
 * promise a rank the server will then decline. Two of the rules below
 * reached the evaluator alone while the pitch kept its own copy, and for
 * each of them the modal advertised black belt for games the server refused:
 * the standard-start bar, and the peek total read from the monotonic ledger.
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
 * feeding rows through a stubbed database module — and the client half
 * could not call it at all without dragging `server-only` into the bundle.
 */
export function qualifiesAsHiddenBoardWin(row: HiddenBoardWinEvidence, maxPeeks: number): boolean {
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
