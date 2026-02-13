import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

// Skill level types and options
// Stockfish supports Skill Level 0-20
export type SkillLevel = number;

// Validate skill level is within valid range (1-20)
// We start from 1 instead of 0 to avoid complete random moves
export function isValidSkillLevel(level: number): level is SkillLevel {
  return Number.isInteger(level) && level >= 1 && level <= 20;
}

// Game settings
export type GameSettings = {
  color: Side;
  skillLevel: SkillLevel;
};

// Game outcome from player's perspective
export type GameOutcome = 'in_progress' | 'win' | 'loss' | 'draw';

export type Game = {
  id: string;
  date: string;
  lastPlayed?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: GameOutcome;
  /** Custom starting position FEN. If undefined, standard starting position is used. */
  startingFen?: string;
};

export type GameSortOption = 'lastPlayed' | 'created';
export type SortDirection = 'asc' | 'desc';
