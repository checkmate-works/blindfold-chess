import {
  getStartingFen,
  validateFen,
  validateMoveSequence,
} from '@blindfold-chess/features/chess-core';

import { engineApproxElo, isEngineConfig } from '@/lib/engines';
import type { EngineConfig } from '@/lib/engines';

import { isBoardVisibility } from './board-visibility';
import { computeGameStats } from './compute-game-stats';
import { MAX_DESCRIPTION_LENGTH, MAX_MOVES, MAX_TITLE_LENGTH } from './publish-constants';
import type { GamePlaySettings, MoveOperationLog } from './saved-game-types';

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
  playerColor: PlayerColor;
  engineConfig: EngineConfig;
  result: GameOutcome;
  operationLogs: MoveOperationLog[] | null;
  playSettings: GamePlaySettings | null;
};

/** Denormalized columns derived from a validated snapshot. */
export type GameColumns = {
  engineKind: 'stockfish' | 'maia';
  engineElo: number;
  moveCount: number;
  cleanRate: number | null;
};

export type ValidatePublishResult =
  | { ok: true; game: ValidatedGame }
  | { ok: false; error: string };

const OUTCOMES: readonly GameOutcome[] = ['win', 'loss', 'draw'];
const COLORS: readonly PlayerColor[] = ['white', 'black'];

const PIECE_SHAPE_MODES = ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const;
const PIECE_COLORS = ['normal', 'white-only', 'black-only'] as const;

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
  return {
    boardVisibility: r.boardVisibility,
    showOwnPieces: r.showOwnPieces,
    showOpponentPieces: r.showOpponentPieces,
    pieceShapeMode: r.pieceShapeMode as GamePlaySettings['pieceShapeMode'],
    pieceColors: r.pieceColors as GamePlaySettings['pieceColors'],
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

  // operationLogs are self-reported aid counts; accept an array no longer than
  // the move list, else drop to null rather than rejecting (display tolerates
  // missing logs). computeGameStats reads fields defensively.
  let operationLogs: MoveOperationLog[] | null = null;
  if (Array.isArray(v.operationLogs) && v.operationLogs.length <= moves.length) {
    operationLogs = v.operationLogs as MoveOperationLog[];
  }

  return {
    ok: true,
    game: {
      title,
      description,
      moves,
      startingFen,
      playerColor: v.playerColor as PlayerColor,
      engineConfig: v.engineConfig,
      result: v.result as GameOutcome,
      operationLogs,
      playSettings: normalizePlaySettings(v.playSettings),
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
