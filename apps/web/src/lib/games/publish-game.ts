import {
  getStartingFen,
  validateFen,
  validateMoveSequence,
} from '@blindfold-chess/features/chess-core';

import { engineApproxElo, isEngineConfig } from '@/lib/engines';
import type { EngineConfig } from '@/lib/engines';

import { isBoardVisibility } from './board-visibility';
import { computeGameStats } from './compute-game-stats';
import { isOperationTotals } from './operation-totals';
import { normalizePlaySettingsLog } from './play-settings-log';
import { MAX_DESCRIPTION_LENGTH, MAX_MOVES, MAX_TITLE_LENGTH } from './publish-constants';
import type {
  GamePlaySettings,
  MoveOperationLog,
  OperationTotals,
  PlaySettingsChangeEntry,
  UndoneMoveLog,
} from './saved-game-types';
import { MAX_UNDONE_LOGS, isUndoneMoveLog } from './undone-logs';

/**
 * Validation + denormalization for publishing a shared game.
 *
 * Anti-tamper posture: the client self-reports the game snapshot, but on
 * publish (a public artifact) the server re-verifies move *legality* via
 * chess-core and recomputes every denormalized column (`engine_elo`,
 * `clean_rate`, …) from the submitted data — the client's own derived values
 * are never trusted. The *result* (win/loss/draw) stays self-reported: it can
 * end in resignation or timeout, which a final-position check cannot confirm,
 * so legality is the integrity gate, not outcome.
 */

export { MAX_DESCRIPTION_LENGTH, MAX_MOVES, MAX_TITLE_LENGTH } from './publish-constants';

export type GameOutcome = 'win' | 'loss' | 'draw';
export type PlayerColor = 'white' | 'black';

/** Validated, normalized snapshot ready to persist. */
export type ValidatedGame = {
  title: string;
  description: string | null;
  moves: string[];
  startingFen: string | null;
  /** Seeded setup-prefix length ({@link Game.setupPlies}); null = no prefix. */
  setupPlies: number | null;
  playerColor: PlayerColor;
  engineConfig: EngineConfig;
  result: GameOutcome;
  operationLogs: MoveOperationLog[] | null;
  /**
   * Monotonic game-lifetime aid counters — the undo-proof companion to
   * {@link operationLogs}. Null when absent or malformed (legacy clients).
   */
  operationTotals: OperationTotals | null;
  /**
   * Per-move log records discarded by Undo / restart-from-position, archived
   * so rollbacks erase nothing (notably rejected SAN texts). Null when
   * absent or malformed.
   */
  undoneLogs: UndoneMoveLog[] | null;
  playSettings: GamePlaySettings | null;
  /** Display-relevant mid-game settings edits, enabling per-position display. */
  playSettingsLog: PlaySettingsChangeEntry[] | null;
};

/** Denormalized columns derived from a validated snapshot. */
export type GameColumns = {
  engineKind: 'stockfish' | 'maia';
  engineElo: number;
  moveCount: number;
  cleanRate: number | null;
};

export type ValidatePublishResult =
  { ok: true; game: ValidatedGame } | { ok: false; error: string };

const OUTCOMES: readonly GameOutcome[] = ['win', 'loss', 'draw'];
const COLORS: readonly PlayerColor[] = ['white', 'black'];

const PIECE_SHAPE_MODES = ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const;
const PIECE_COLORS = ['normal', 'white-only', 'black-only'] as const;
const PAWN_HIDE_MODES = ['none', 'all', 'own', 'opponent'] as const;

// Bounds for the self-reported `invalidAttempts` move texts before they are
// persisted as public data: at most this many per move, each clipped to a SAN-
// sized length (the longest real SAN, e.g. "exd8=Q+", is well under this).
const MAX_INVALID_ATTEMPTS = 20;
const MAX_INVALID_ATTEMPT_LEN = 12;

// Bounds for an archived undo's retracted SAN(s): only the player's move and
// the AI's reply are ever recorded (see UndoneMoveLog.sans), and real SAN
// tops out around "exd8=Q#" (7 chars) — 10 leaves headroom without inviting
// abuse.
const MAX_SANS_PER_UNDO = 2;
const MAX_SAN_LEN = 10;

/**
 * Normalize the self-reported play settings into the validated display subset,
 * or null if absent / malformed. Display-only metadata, so a bad value is
 * dropped (settings simply won't render) rather than rejecting the publish.
 */
function normalizePlaySettings(raw: unknown): GamePlaySettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isBoardVisibility(r.boardVisibility)) return null;
  if (typeof r.showOwnPieces !== 'boolean' || typeof r.showOpponentPieces !== 'boolean') {
    return null;
  }
  if (!PIECE_SHAPE_MODES.includes(r.pieceShapeMode as (typeof PIECE_SHAPE_MODES)[number])) {
    return null;
  }
  if (!PIECE_COLORS.includes(r.pieceColors as (typeof PIECE_COLORS)[number])) return null;
  // `pawnHideMode` was added after this shape settled, so older self-reported
  // snapshots may omit it — default a missing / invalid value to 'none' rather
  // than rejecting the whole settings blob (which would drop the indicator).
  const pawnHideMode = PAWN_HIDE_MODES.includes(r.pawnHideMode as (typeof PAWN_HIDE_MODES)[number])
    ? (r.pawnHideMode as GamePlaySettings['pawnHideMode'])
    : 'none';
  return {
    boardVisibility: r.boardVisibility,
    showOwnPieces: r.showOwnPieces,
    showOpponentPieces: r.showOpponentPieces,
    pieceShapeMode: r.pieceShapeMode as GamePlaySettings['pieceShapeMode'],
    pieceColors: r.pieceColors as GamePlaySettings['pieceColors'],
    pawnHideMode,
  };
}

/**
 * Validate an untrusted publish payload. Returns a normalized snapshot or a
 * stable error code (suitable for mapping to i18n at the call site).
 */
export function validatePublishSnapshot(input: unknown): ValidatePublishResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'invalid_input' };
  const v = input as Record<string, unknown>;

  const title = typeof v.title === 'string' ? v.title.trim() : '';
  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: 'invalid_title' };
  }

  let description: string | null = null;
  if (v.description != null) {
    if (typeof v.description !== 'string') return { ok: false, error: 'invalid_description' };
    const trimmed = v.description.trim();
    if (trimmed.length > MAX_DESCRIPTION_LENGTH) return { ok: false, error: 'invalid_description' };
    description = trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(v.moves) || !v.moves.every((m) => typeof m === 'string')) {
    return { ok: false, error: 'invalid_moves' };
  }
  const moves = v.moves as string[];
  if (moves.length === 0 || moves.length > MAX_MOVES) {
    return { ok: false, error: 'invalid_moves' };
  }

  if (!COLORS.includes(v.playerColor as PlayerColor)) {
    return { ok: false, error: 'invalid_player_color' };
  }
  if (!OUTCOMES.includes(v.result as GameOutcome)) {
    return { ok: false, error: 'invalid_result' };
  }
  if (!isEngineConfig(v.engineConfig)) {
    return { ok: false, error: 'invalid_engine' };
  }

  let startingFen: string | null = null;
  if (v.startingFen != null) {
    if (typeof v.startingFen !== 'string' || !validateFen(v.startingFen)) {
      return { ok: false, error: 'invalid_fen' };
    }
    startingFen = v.startingFen;
  }

  // Integrity gate: every move must be legal from the starting position.
  const seq = validateMoveSequence(startingFen ?? getStartingFen(), moves);
  if (!seq.valid) {
    return { ok: false, error: 'illegal_moves' };
  }

  // Seeded setup-prefix length. Display-only metadata (drives the replay's
  // starting-position board + ops alignment), so a malformed or out-of-range
  // value is dropped to null — the game still publishes, just without the
  // prefix info — matching the playSettings posture. 0 is stored as null.
  let setupPlies: number | null = null;
  if (
    typeof v.setupPlies === 'number' &&
    Number.isInteger(v.setupPlies) &&
    v.setupPlies > 0 &&
    v.setupPlies <= moves.length
  ) {
    setupPlies = v.setupPlies;
  }

  // operationLogs are self-reported aid counts; accept an array no longer than
  // the move list, else drop to null rather than rejecting (display tolerates
  // missing logs). computeGameStats reads fields defensively. The numeric
  // fields are trusted as-is, but the new free-text `invalidAttempts` is bounded
  // (count + length) before it becomes public data.
  let operationLogs: MoveOperationLog[] | null = null;
  if (Array.isArray(v.operationLogs) && v.operationLogs.length <= moves.length) {
    operationLogs = (v.operationLogs as MoveOperationLog[]).map((log) => {
      if (!log || typeof log !== 'object') return log;
      const raw = (log as { invalidAttempts?: unknown }).invalidAttempts;
      if (!Array.isArray(raw)) return log;
      const attempts = raw
        .filter((s): s is string => typeof s === 'string')
        .slice(0, MAX_INVALID_ATTEMPTS)
        .map((s) => s.slice(0, MAX_INVALID_ATTEMPT_LEN));
      return { ...log, invalidAttempts: attempts.length > 0 ? attempts : undefined };
    });
  }

  // Monotonic lifetime totals: same self-reported posture as operationLogs
  // (numbers trusted as-is once the shape checks out), but a malformed blob
  // drops to null rather than rejecting the publish. Whitelist-copied so no
  // extra keys reach the DB. Null feeds the rank evaluator's legacy path,
  // which fails closed on undos — absence never makes promotion easier.
  const operationTotals: OperationTotals | null = isOperationTotals(v.operationTotals)
    ? {
        peeks: v.operationTotals.peeks,
        movePeeks: v.operationTotals.movePeeks,
        undos: v.operationTotals.undos,
        invalidMoves: v.operationTotals.invalidMoves,
      }
    : null;

  // Archived rollback discards: same audit-metadata posture (malformed →
  // null, never a rejection). Entry count and every free-text SAN list are
  // re-bounded server-side — the client caps them too, but a crafted payload
  // must not bloat the public row. Whitelist-copied per entry.
  let undoneLogs: UndoneMoveLog[] | null = null;
  if (Array.isArray(v.undoneLogs) && v.undoneLogs.every((entry) => isUndoneMoveLog(entry))) {
    const boundAttempts = (attempts: string[] | undefined): string[] | undefined => {
      if (!attempts || attempts.length === 0) return undefined;
      return attempts
        .slice(0, MAX_INVALID_ATTEMPTS)
        .map((s) => s.slice(0, MAX_INVALID_ATTEMPT_LEN));
    };
    const bounded = (v.undoneLogs as UndoneMoveLog[]).slice(0, MAX_UNDONE_LOGS).map((entry) => {
      const out: UndoneMoveLog = { index: entry.index };
      if (entry.log !== undefined) {
        out.log = {
          inputMethod: entry.log.inputMethod,
          peekCount: entry.log.peekCount,
          undoCount: entry.log.undoCount,
          movePeekCount: entry.log.movePeekCount,
          invalidCount: entry.log.invalidCount,
          invalidAttempts: boundAttempts(entry.log.invalidAttempts),
        };
      }
      const pending = boundAttempts(entry.pendingInvalidAttempts);
      if (pending) out.pendingInvalidAttempts = pending;
      if (entry.sans && entry.sans.length > 0) {
        out.sans = entry.sans.slice(0, MAX_SANS_PER_UNDO).map((s) => s.slice(0, MAX_SAN_LEN));
      }
      return out;
    });
    undoneLogs = bounded.length > 0 ? bounded : null;
  }

  return {
    ok: true,
    game: {
      title,
      description,
      moves,
      startingFen,
      setupPlies,
      playerColor: v.playerColor as PlayerColor,
      engineConfig: v.engineConfig,
      result: v.result as GameOutcome,
      operationLogs,
      operationTotals,
      undoneLogs,
      playSettings: normalizePlaySettings(v.playSettings),
      // Self-reported mid-game settings timeline; validated to the display
      // subset and anchored within [0, moves.length]. Folded over playSettings
      // per position by the replay indicator. Dropped to null when absent.
      playSettingsLog: normalizePlaySettingsLog(v.playSettingsLog, moves.length),
    },
  };
}

/**
 * Recompute the denormalized gallery columns from a validated snapshot.
 * `move_count` is plies (raw `moves.length`); `clean_rate` is the share of the
 * player's moves made with no aid, derived from `operation_logs` — null when no
 * logs were submitted.
 */
export function deriveGameColumns(game: ValidatedGame): GameColumns {
  const stats = game.operationLogs ? computeGameStats(game.operationLogs) : null;
  const cleanRate =
    stats && stats.totalMoves > 0 ? Math.round((stats.cleanMoves / stats.totalMoves) * 100) : null;

  return {
    engineKind: game.engineConfig.kind,
    engineElo: engineApproxElo(game.engineConfig),
    moveCount: game.moves.length,
    cleanRate,
  };
}
