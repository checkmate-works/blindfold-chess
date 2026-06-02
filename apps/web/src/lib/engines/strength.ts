import { getEloForSkillLevel } from '@blindfold-chess/features/ai-game';

import type { EngineConfig } from './config';

/**
 * Unified approximate Elo for an engine config, used to denormalize a shared
 * game's `engine_elo` so Stockfish and Maia games sort/filter on one comparable
 * strength axis in the public gallery.
 *
 * Maia ratings are already an Elo and pass through unchanged. Stockfish skill
 * levels reuse {@link getEloForSkillLevel} — the same mapping the engine is
 * actually configured with — so the displayed strength matches how the opponent
 * plays rather than introducing a second, drift-prone scale.
 */
export function engineApproxElo(config: EngineConfig): number {
  return config.kind === 'maia' ? config.rating : getEloForSkillLevel(config.skillLevel);
}
