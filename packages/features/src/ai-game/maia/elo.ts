/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Maia adapter — `Stockfish-style skill level` ↔ `Maia Elo` mapping.
 *
 * The product UI surfaces a single 1..20 "skill level" slider that
 * applies to whichever engine the player has picked. Stockfish consumes
 * skill level directly. Maia 3 consumes a continuous Elo (~1100..1900
 * training distribution); outside that range the network extrapolates
 * and quality drops, so we clamp the slider's range onto the trained
 * window rather than letting users pick weights the model never saw.
 *
 * Values are rounded to the nearest 10 — granular enough that no two
 * consecutive levels collide, but round enough that the displayed Elo
 * doesn't read as a meaningless fraction (1268 reads worse than 1270).
 *
 * Mapping (linear, clamped, rounded to nearest 10):
 *
 *   level  1 → 1100 Elo  (Maia's lowest trained Elo)
 *   level  5 → 1270 Elo
 *   level 10 → 1480 Elo
 *   level 15 → 1690 Elo
 *   level 20 → 1900 Elo  (Maia's highest trained Elo)
 */

import type { SkillLevel } from "../types";

import type { MaiaElo } from "./types";

const MAIA_ELO_MIN = 1100;
const MAIA_ELO_MAX = 1900;
const SKILL_LEVEL_MIN = 1;
const SKILL_LEVEL_MAX = 20;
const ELO_ROUNDING_STEP = 10;

/**
 * Convert a Stockfish-style 1..20 skill level into a Maia Elo within the
 * 1100..1900 training distribution. Out-of-range inputs are clamped
 * rather than rejected, so a future widened slider still produces sane
 * Maia configs without touching this code.
 */
export function skillLevelToMaiaElo(level: SkillLevel): MaiaElo {
  const clamped = Math.max(SKILL_LEVEL_MIN, Math.min(SKILL_LEVEL_MAX, level));
  const t = (clamped - SKILL_LEVEL_MIN) / (SKILL_LEVEL_MAX - SKILL_LEVEL_MIN);
  const raw = MAIA_ELO_MIN + t * (MAIA_ELO_MAX - MAIA_ELO_MIN);
  return Math.round(raw / ELO_ROUNDING_STEP) * ELO_ROUNDING_STEP;
}
