import type { SkillLevel } from "./types";

/**
 * Validate skill level is within valid range (1-20).
 * We start from 1 instead of 0 to avoid complete random moves.
 */
export function isValidSkillLevel(level: number): level is SkillLevel {
  return Number.isInteger(level) && level >= 1 && level <= 20;
}
