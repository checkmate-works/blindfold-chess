import type { SkillLevel } from "./types";

export const DEFAULT_TIME_LIMIT = 1000;

export function getEloForSkillLevel(level: SkillLevel): number {
  if (level < 15) {
    return Math.max(800, 700 + level * 100);
  }
  // For levels 15-20, these are full-strength or near-full-strength
  return 2000 + level * 100;
}

export function isLimitedStrength(level: SkillLevel): boolean {
  return level < 15;
}
