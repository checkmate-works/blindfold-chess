/**
 * Exp Calculation for AI Game Results (AI対局の経験値計算)
 *
 * @description
 * Pure calculation logic for experience points earned from completing an AI
 * game (Stockfish / Maia). Mirrors the three-layer structure agreed for game
 * rewards:
 *
 *   totalExp = floor(difficultyBase × resultMultiplier × purityMultiplier)
 *
 * 1. difficultyBase — derived from the engine strength. A weak opponent yields
 *    a small base, which intentionally makes farming easy opponents unrewarding
 *    (the "bake anti-farming into the curve" decision). Combined with the
 *    server-side daily cap, this keeps grinding low-value.
 * 2. resultMultiplier — win / draw / loss. A loss still earns a small completion
 *    reward (engagement), echoing {@link MIN_COMPLETION_EXP}.
 * 3. purityMultiplier — the blindfold-purity bonus. Games played without aids
 *    (board peeks, move hints, takebacks) earn the full bonus; relying on aids
 *    decays it. This reuses exactly the per-move markers the result screen's
 *    effort strip already visualizes, so the "no-cheating bonus" explains itself
 *    in the UI.
 *
 * The calculator is platform-independent and engine-agnostic: callers map their
 * own EngineConfig into {@link GameExpEngine} using plain numbers, so this
 * module never imports app-level or platform types.
 *
 * @see {@link ./calc.ts} for the challenge-mode calculator (calculateExp)
 * @see {@link ./calc-practice.ts} for the free-play calculator (calculatePracticeExp)
 * @see {@link ../../../apps/web/src/lib/db/save-game-exp.ts} for persistence (grantGameExp)
 */
import type { FinalGameOutcome } from "@blindfold-chess/types";

import { MIN_COMPLETION_EXP } from "./constants";

/**
 * Outcome of a completed AI game from the player's perspective. Named for this
 * module's vocabulary, but the same set as the shared `FinalGameOutcome` — see
 * `PlayerResult` in `../ai-game/types` for why the aliases point at one union.
 */
export type GameExpOutcome = FinalGameOutcome;

/**
 * Engine-strength descriptor. Callers pass plain numbers (not the literal
 * `SkillLevel` / `MaiaRating` unions) so out-of-range values degrade gracefully
 * via clamping rather than being a type error at the boundary.
 */
export type GameExpEngine =
  { kind: "stockfish"; skillLevel: number } | { kind: "maia"; rating: number };

export type GameExpInput = {
  /** Game outcome from the player's perspective. */
  result: GameExpOutcome;
  /** The AI opponent's configured strength. */
  engine: GameExpEngine;
  /** Number of moves the player actually made. A game with 0 earns nothing. */
  playerMoveCount: number;
  /**
   * Number of the player's moves that used any aid (board peek, move hint, or
   * takeback). Illegal-move attempts are deliberately excluded — they are
   * failed inputs, not blindfold-defeating aids.
   */
  aidedMoveCount: number;
};

export type GameExpResult = {
  difficultyBase: number;
  resultMultiplier: number;
  purityMultiplier: number;
  totalExp: number;
};

// --- Difficulty base ----------------------------------------------------------

/** Floor base for the weakest opponents (anti-farming: weak = low reward). */
export const GAME_EXP_BASE_FLOOR = 5;
/** Base for the strongest opponents (Stockfish Lv20 / Maia 2600). */
export const GAME_EXP_BASE_MAX = 120;

export const STOCKFISH_MAX_SKILL = 20;
export const MAIA_MIN_RATING = 600;
export const MAIA_MAX_RATING = 2600;

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Maps an engine config to a strength factor in [0, 1], then to a base Exp
 * value between {@link GAME_EXP_BASE_FLOOR} and {@link GAME_EXP_BASE_MAX}.
 */
export function difficultyBase(engine: GameExpEngine): number {
  const factor =
    engine.kind === "stockfish"
      ? clamp01(engine.skillLevel / STOCKFISH_MAX_SKILL)
      : clamp01(
          (engine.rating - MAIA_MIN_RATING) /
            (MAIA_MAX_RATING - MAIA_MIN_RATING),
        );

  return (
    GAME_EXP_BASE_FLOOR +
    Math.round((GAME_EXP_BASE_MAX - GAME_EXP_BASE_FLOOR) * factor)
  );
}

// --- Result multiplier --------------------------------------------------------

export const RESULT_MULTIPLIER: Record<GameExpOutcome, number> = {
  win: 1.0,
  draw: 0.5,
  loss: 0.2,
};

// --- Purity multiplier --------------------------------------------------------

/**
 * Blindfold-purity bonus based on the fraction of the player's moves that used
 * an aid. A fully clean game earns the perfect ×1.5 (matching the practice
 * perfect bonus); heavier reliance on aids decays toward a ×0.6 floor.
 */
export function purityMultiplier(
  aidedMoveCount: number,
  playerMoveCount: number,
): number {
  if (playerMoveCount <= 0) return 0;
  if (aidedMoveCount <= 0) return 1.5;

  const ratio = aidedMoveCount / playerMoveCount;
  if (ratio <= 0.1) return 1.2;
  if (ratio <= 0.25) return 1.0;
  if (ratio <= 0.5) return 0.8;
  return 0.6;
}

// --- Daily cap ----------------------------------------------------------------

/**
 * Soft daily cap on Exp earned from AI games, applied server-side. This is the
 * primary guard against farming many quick games. Enforced in
 * `grantGameExp` using `SUM(amount)` over today's `ai_game_result` events.
 */
export const GAME_EXP_DAILY_CAP = 500;

/**
 * Clamps a fresh grant to the remaining daily budget. Pure so it can be unit
 * tested in isolation from the database read that supplies
 * `alreadyEarnedToday`.
 */
export function applyDailyCap(
  earned: number,
  alreadyEarnedToday: number,
  cap: number = GAME_EXP_DAILY_CAP,
): number {
  const remaining = Math.max(0, cap - alreadyEarnedToday);
  return Math.min(earned, remaining);
}

// --- Top-level calculator -----------------------------------------------------

/**
 * Pure calculator for AI-game Exp grants.
 *
 * Returns `totalExp = 0` for a game with no player moves (e.g., an instant
 * resignation); callers MUST NOT persist a zero grant. A played game earns at
 * least {@link MIN_COMPLETION_EXP}.
 *
 * Note: the returned `totalExp` is the *uncapped* earned amount. The daily cap
 * is applied separately at grant time via {@link applyDailyCap}, so the metadata
 * can record both the earned and the actually-granted figures.
 */
export function calculateGameExp(input: GameExpInput): GameExpResult {
  const { result, engine, playerMoveCount, aidedMoveCount } = input;

  const base = difficultyBase(engine);
  const resultMult = RESULT_MULTIPLIER[result];
  const purityMult = purityMultiplier(aidedMoveCount, playerMoveCount);

  const raw = Math.floor(base * resultMult * purityMult);
  const totalExp = playerMoveCount > 0 ? Math.max(MIN_COMPLETION_EXP, raw) : 0;

  return {
    difficultyBase: base,
    resultMultiplier: resultMult,
    purityMultiplier: purityMult,
    totalExp,
  };
}
