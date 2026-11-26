import { PLAYER_RESULTS } from '@blindfold-chess/features/ai-game';
import type { GameExpEngine, GameExpOutcome } from '@blindfold-chess/features/exp';

import { UUID_RE } from '@/lib/validations/uuid';

/** A finished AI game as its client reports it, checked and clamped. */
export type AiGameResultReport = {
  /** The game's client-side UUID — the grant's idempotency key. */
  gameId: string;
  result: GameExpOutcome;
  engine: GameExpEngine;
  playerMoveCount: number;
  aidedMoveCount: number;
};

/**
 * Narrow an untrusted engine payload to {@link GameExpEngine}. Difficulty
 * values are passed through as plain numbers — the calculator clamps
 * out-of-range inputs, so we only require a finite number of the right kind.
 */
function normalizeEngine(value: unknown): GameExpEngine | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.kind === 'stockfish' && typeof v.skillLevel === 'number' && Number.isFinite(v.skillLevel)) {
    return { kind: 'stockfish', skillLevel: v.skillLevel };
  }
  if (v.kind === 'maia' && typeof v.rating === 'number' && Number.isFinite(v.rating)) {
    return { kind: 'maia', rating: v.rating };
  }
  return null;
}

/**
 * Check a self-reported AI game result before Exp is granted for it. Shared
 * by the web's Server Action and the mobile API route so both clients are
 * held to the same rules; returns `null` for a payload that cannot be a game.
 *
 * The move counts are clamped rather than rejected: aided moves can never
 * exceed the move count, so a tampered payload cannot push the purity ratio
 * above 1. A report with no player moves is valid and comes back with
 * `playerMoveCount: 0` — the caller grants nothing for it.
 */
export function parseAiGameResultReport(input: unknown): AiGameResultReport | null {
  if (!input || typeof input !== 'object') return null;
  const v = input as Record<string, unknown>;

  if (typeof v.gameId !== 'string' || !UUID_RE.test(v.gameId)) return null;
  const result = PLAYER_RESULTS.find((r) => r === v.result);
  if (!result) return null;
  const engine = normalizeEngine(v.engine);
  if (!engine) return null;

  const playerMoveCount = Math.max(0, Math.round(Number(v.playerMoveCount) || 0));
  const aidedMoveCount = Math.min(
    playerMoveCount,
    Math.max(0, Math.round(Number(v.aidedMoveCount) || 0))
  );

  return { gameId: v.gameId, result, engine, playerMoveCount, aidedMoveCount };
}
