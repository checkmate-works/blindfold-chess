import type { SkillLevel } from '@/lib/types';

/**
 * Maps a Stockfish skill level (1-20) to an approximate ELO rating.
 * This mapping is based on the UCI_Elo settings used in chess-engine.ts
 *
 * @param level - Skill level from 1 to 20
 * @returns Approximate ELO rating
 */
export function getEloRating(level: SkillLevel): number {
  // For levels 1-14, use the same formula as in chess-engine.ts
  // Level 1 (~800 Elo) to Level 14 (~2100 Elo)
  if (level < 15) {
    return Math.max(800, 700 + level * 100);
  }

  // For levels 15-20, these are full-strength or near-full-strength
  // We approximate these as high-level play
  // Level 15: ~2200, Level 16: ~2400, Level 17: ~2600, Level 18: ~2800, Level 19: ~3000, Level 20: ~3200+
  return 2000 + level * 100;
}

/**
 * Formats the skill level with its ELO rating for display
 *
 * @param level - Skill level from 1 to 20
 * @returns Formatted string like "Level 5 (1200 ELO)"
 */
export function formatSkillLevelWithElo(level: SkillLevel): string {
  const elo = getEloRating(level);
  return `Level ${level} (${elo} ELO)`;
}
