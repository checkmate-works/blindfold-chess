import type { SkillLevel } from "./types";
import { getEloForSkillLevel, isLimitedStrength } from "./constants";

/**
 * Generate the sequence of UCI commands needed to configure
 * Stockfish's playing strength for a given skill level.
 *
 * The caller is responsible for sending these commands to the engine
 * via whatever transport (Web Worker, WebView, etc.) is available.
 */
export function buildSkillLevelCommands(level: SkillLevel): string[] {
  const commands: string[] = [];

  commands.push(`setoption name Skill Level value ${level}`);

  if (isLimitedStrength(level)) {
    commands.push("setoption name UCI_LimitStrength value true");
    const targetElo = getEloForSkillLevel(level);
    commands.push(`setoption name UCI_Elo value ${targetElo}`);
  } else {
    commands.push("setoption name UCI_LimitStrength value false");
  }

  return commands;
}
