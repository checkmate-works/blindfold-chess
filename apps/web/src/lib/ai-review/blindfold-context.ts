import type { Side } from '@blindfold-chess/types';

import type { GameRecord } from '@/lib/db/schema';
import type { MoveAnalysis } from '@/lib/games/analysis/types';
import type { BoardVisibility } from '@/lib/games/board-visibility';
import { isConstrainedPlaySettings } from '@/lib/games/play-settings-constraint';
import { playSettingsAtHalfMove } from '@/lib/games/play-settings-log';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
} from '@/lib/games/saved-game-types';

/**
 * The blindfold side of a game, distilled for the review prompt.
 *
 * The review used to describe a game purely through the engine's eyes —
 * moves, evaluations, an opening name — which is exactly the part of a
 * blindfold game that is NOT special. What makes it one is that the player
 * could not see the board (or could see only part of it), and the
 * aid-usage records say when that sight failed: a run of rejected moves
 * right before a blunder means the player's picture of the position had
 * already drifted, which is a different lesson from "you missed a tactic".
 * Everything here is already on the game record; this module only aligns
 * it with the engine's moments so the two can be read together.
 *
 * ## What is and is not trusted
 *
 * The counters are self-reported (see `saved-game-types.ts`) and are passed
 * through as numbers — a lie here only distorts the author's own review.
 * The rejected-move TEXTS are different: `invalidAttempts` are bounded at
 * publish time by length only (`sanitize-published-logs.ts`), so a text-input
 * attempt is whatever the author typed. The prompt's free-form inputs are
 * meant to be SAN tokens and server-derived numbers (see `./prompt`), and a
 * review is public, so an author must not be able to smuggle prose into it
 * through their own rejected moves. {@link keepMoveShapedAttempts} admits
 * only strings that look like a chess move; everything else survives as a
 * count.
 *
 * ## Two ledgers
 *
 * Per-move logs are the display record and follow "undo = it never happened",
 * so a peek → undo → replay sequence leaves no trace in them. The monotonic
 * `operationTotals` do not forget. The moment-level context comes from the
 * logs (that is where "what happened right before THIS move" lives); the
 * game-level aggregate comes from the totals, and the gap between the two is
 * reported separately as the aid usage a takeback erased — itself a signal
 * of hesitation that the logs alone would hide.
 */

/** Aid counters in the review's vocabulary (one per `OperationTotals` key). */
export type AidCounts = {
  /** Board reveals (peek mode). */
  peeks: number;
  /** Legal-move hints consulted. */
  hints: number;
  /** Takebacks. */
  undos: number;
  /** Rejected move submissions. */
  illegalAttempts: number;
};

/** Short server-derived tags naming what the counters around one move suggest. */
export type BlindfoldMomentSignal =
  /** Two or more rejected attempts right before the move: the player's picture of the position had likely drifted. */
  | 'board_image_drift'
  /** The move was made after revealing the board or consulting a hint — the error happened with sight. */
  | 'played_with_aid'
  /** The player took back and re-played before settling on this move. */
  | 'retried';

/** The blindfold conditions and aid usage around one selected moment. */
export type BlindfoldMomentContext = {
  ply: number;
  /** How much of the board the player could see when choosing this move. */
  visibility: BoardVisibility;
  aid: AidCounts;
  /** Move-shaped subset of the rejected texts, in attempt order (see module TSDoc). */
  rejectedMoves: string[];
  signals: BlindfoldMomentSignal[];
};

export type BlindfoldContext = {
  /** The start-of-game settings. */
  start: GamePlaySettings;
  /** Whether any display setting was changed mid-game. */
  changedMidGame: boolean;
  /**
   * Game-lifetime aid usage, from the monotonic totals when the game recorded
   * them, otherwise summed from the per-move logs (lossy — see module TSDoc).
   */
  totals: AidCounts;
  /**
   * Aid usage that a takeback removed from the per-move record
   * (`totals − Σ logs`), or null when the game has no monotonic totals to
   * compare against. Undos are not included: a takeback cannot erase itself.
   */
  erasedByUndo: Omit<AidCounts, 'undos'> | null;
  /**
   * Whether the player's accuracy fell off in the second half of their
   * moves — the fading-picture pattern of a long blindfold game. Only judged
   * with enough moves to halve meaningfully.
   */
  lateGameDecline: boolean;
  /** One entry per selected moment that is a player move with a log entry. */
  moments: BlindfoldMomentContext[];
};

/** The game-record fields this module reads. */
export type BlindfoldContextSource = Pick<
  GameRecord,
  'playSettings' | 'playSettingsLog' | 'operationLogs' | 'operationTotals' | 'setupPlies'
>;

/** At least this many rejected attempts before a move reads as a lost board image. */
const DRIFT_ATTEMPT_THRESHOLD = 2;

/** Fewest player moves for the first-half / second-half comparison to mean anything. */
const MIN_MOVES_FOR_TREND = 12;

/**
 * The second half must lose at least this many centipawns per move more than
 * the first, AND at least this multiple of it, to count as a decline — the
 * absolute floor keeps a 3 → 8 cp difference from qualifying.
 */
const DECLINE_MIN_CP_DELTA = 40;
const DECLINE_MIN_RATIO = 1.5;

/**
 * A rejected attempt as the chess-move shapes the app itself produces:
 * SAN with optional disambiguation / capture / promotion (`Nf3`, `exd5`,
 * `R1e2`, `e8=Q`), castling, or the board's coordinate form (`e2-e4`).
 * Trailing check marks are stripped first. Anything else — which on the
 * text-input path can be arbitrary typing — is deliberately not matched.
 */
const MOVE_SHAPED_RE =
  /^(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?|O-O(?:-O)?|[a-h][1-8]-[a-h][1-8])$/;

/** Keep only the attempts that look like a chess move (see {@link MOVE_SHAPED_RE}). */
export function keepMoveShapedAttempts(attempts: readonly string[] | undefined): string[] {
  if (!attempts) return [];
  return attempts.map((a) => a.replace(/[+#]+$/, '')).filter((a) => MOVE_SHAPED_RE.test(a));
}

function aidCountsOf(log: MoveOperationLog): AidCounts {
  return {
    peeks: log.peekCount,
    hints: log.movePeekCount ?? 0,
    undos: log.undoCount,
    illegalAttempts: log.invalidCount ?? 0,
  };
}

function sumAid(logs: readonly MoveOperationLog[]): AidCounts {
  const sum: AidCounts = { peeks: 0, hints: 0, undos: 0, illegalAttempts: 0 };
  for (const log of logs) {
    const aid = aidCountsOf(log);
    sum.peeks += aid.peeks;
    sum.hints += aid.hints;
    sum.undos += aid.undos;
    sum.illegalAttempts += aid.illegalAttempts;
  }
  return sum;
}

function fromTotals(totals: OperationTotals): AidCounts {
  return {
    peeks: totals.peeks,
    hints: totals.movePeeks,
    undos: totals.undos,
    illegalAttempts: totals.invalidMoves,
  };
}

function signalsFor(aid: AidCounts): BlindfoldMomentSignal[] {
  const signals: BlindfoldMomentSignal[] = [];
  if (aid.illegalAttempts >= DRIFT_ATTEMPT_THRESHOLD) signals.push('board_image_drift');
  if (aid.peeks > 0 || aid.hints > 0) signals.push('played_with_aid');
  if (aid.undos > 0) signals.push('retried');
  return signals;
}

/**
 * Whether the player's mean centipawn loss in the second half of their moves
 * exceeds the first half's by both the absolute and the relative margin.
 */
function hasLateGameDecline(playerMoves: readonly MoveAnalysis[]): boolean {
  if (playerMoves.length < MIN_MOVES_FOR_TREND) return false;
  const half = Math.floor(playerMoves.length / 2);
  const mean = (slice: readonly MoveAnalysis[]) =>
    slice.reduce((acc, a) => acc + a.cpLoss, 0) / slice.length;
  const early = mean(playerMoves.slice(0, half));
  const late = mean(playerMoves.slice(half));
  return late - early >= DECLINE_MIN_CP_DELTA && late >= early * DECLINE_MIN_RATIO;
}

/**
 * Build the blindfold context for a review, or null when the game was played
 * fully sighted or its conditions are unknown.
 *
 * The null cases matter as much as the populated one: a legacy row (no
 * settings) and a game that showed everything must NOT be coached as
 * blindfold games, so callers render nothing rather than a "conditions
 * unknown" line the model would still read as blindfold.
 *
 * Alignment: `operationLogs[i]` is the i-th PLAYER move after the seeded
 * `setupPlies` prefix — the rule `move-ops-alignment.ts` owns for the UI,
 * restated here on `MoveAnalysis` (which already carries `color` and `ply`)
 * so this module does not reach into a route's `_lib`. A log list shorter
 * than the player's moves simply leaves the later moments without context,
 * the same posture as `logForMovesIndex`.
 */
export function buildBlindfoldContext(
  game: BlindfoldContextSource,
  analyses: readonly MoveAnalysis[],
  playerColor: Side,
  momentPlies: readonly number[]
): BlindfoldContext | null {
  const start = game.playSettings;
  if (!start || !isConstrainedPlaySettings(start)) return null;

  const logs = game.operationLogs ?? [];
  const setupPlies = game.setupPlies ?? 0;
  const playerMoves = analyses.filter((a) => a.color === playerColor);
  const loggedPlayerPlies = playerMoves.filter((a) => a.ply >= setupPlies).map((a) => a.ply);

  const wanted = new Set(momentPlies);
  const moments: BlindfoldMomentContext[] = [];
  loggedPlayerPlies.forEach((ply, logIndex) => {
    const log = logs[logIndex];
    if (!wanted.has(ply) || !log) return;
    const aid = aidCountsOf(log);
    moments.push({
      ply,
      visibility: playSettingsAtHalfMove(start, game.playSettingsLog, ply).boardVisibility,
      aid,
      rejectedMoves: keepMoveShapedAttempts(log.invalidAttempts),
      signals: signalsFor(aid),
    });
  });

  const logged = sumAid(logs);
  const totals = game.operationTotals ? fromTotals(game.operationTotals) : logged;
  const erasedByUndo = game.operationTotals
    ? {
        peeks: Math.max(0, totals.peeks - logged.peeks),
        hints: Math.max(0, totals.hints - logged.hints),
        illegalAttempts: Math.max(0, totals.illegalAttempts - logged.illegalAttempts),
      }
    : null;

  return {
    start,
    changedMidGame: (game.playSettingsLog?.length ?? 0) > 0,
    totals,
    erasedByUndo,
    lateGameDecline: hasLateGameDecline(playerMoves),
    moments,
  };
}
