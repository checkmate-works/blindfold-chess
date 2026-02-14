import type { SkillLevel } from "./types";

export const DEFAULT_TIME_LIMIT = 1000;

export function getEloForSkillLevel(level: SkillLevel): number {
  return Math.max(800, 700 + level * 100);
}

export function isLimitedStrength(level: SkillLevel): boolean {
  return level < 15;
}
