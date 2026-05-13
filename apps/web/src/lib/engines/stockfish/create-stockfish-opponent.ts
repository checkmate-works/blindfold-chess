import { ChessEngine } from '@blindfold-chess/features/ai-game/engine';
import { type ChessOpponent, err, ok } from '@blindfold-chess/features/ai-game/opponent';

import type { SkillLevel } from '@/lib/types';

import { createWorkerMessageChannel } from './worker-message-channel';

const STOCKFISH_WORKER_PATH = '/stockfish.js';

/**
 * Default per-move search budget in milliseconds. Matches the pre-refactor
 * behaviour where `useAiVersus` hard-coded 1000ms for every move.
 */
const DEFAULT_MOVE_TIME_MS = 1000;

export type StockfishOpponentConfig = Readonly<{
  skillLevel: SkillLevel;
  /**
   * Per-move search budget in milliseconds. Higher is stronger; lower is
   * snappier. Optional — defaults to {@link DEFAULT_MOVE_TIME_MS}.
   */
  moveTimeMs?: number;
}>;

/**
 * Construct a fresh Stockfish-backed {@link ChessOpponent}.
 *
 * Each call instantiates an isolated `ChessEngine` (and therefore an
 * isolated Worker once the engine boots), so the caller is responsible for
 * the opponent's lifecycle — typically via a hook that calls `destroy()`
 * on unmount and on retry. There is intentionally no module-level
 * singleton: lifecycle is owned by the consumer so that a torn-down
 * opponent cannot be silently observed by an unrelated caller.
 *
 * Skill-level is captured at construction time. To switch skill levels,
 * destroy the current opponent and create a new one — the existing
 * game-session flow already enforces immutable skill level per game.
 */
export function createStockfishOpponent(config: StockfishOpponentConfig): ChessOpponent {
  const engine = new ChessEngine(() => createWorkerMessageChannel(STOCKFISH_WORKER_PATH));

  // setSkillLevel before the worker boots only updates the in-memory level;
  // the actual UCI commands are sent during ensureInitialized (triggered
  // by the first getBestMove call). Awaiting the returned promise gives
  // nothing useful here, so we fire-and-forget.
  void engine.setSkillLevel(config.skillLevel);

  const moveTimeMs = config.moveTimeMs ?? DEFAULT_MOVE_TIME_MS;

  let destroyed = false;

  return {
    async getBestMove({ fen, history, startingFen }) {
      if (destroyed) {
        return err({ kind: 'opponent-destroyed' });
      }
      try {
        const uciMove = await engine.getBestMove(fen, [...history], moveTimeMs, startingFen);
        return ok({ move: uciMove });
      } catch (cause) {
        return err({ kind: 'move-generation-failed', cause });
      }
    },
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      await engine.destroy();
    },
  };
}
