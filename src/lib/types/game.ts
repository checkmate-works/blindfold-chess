import type { AlgebraicNotation, Side } from './chess';

// Skill level types and options
type SkillLevelOption = {
  label: string;
  value: number;
};

export const SKILL_LEVEL_OPTIONS: readonly SkillLevelOption[] = [
  { label: 'Beginner', value: 1 },
  { label: 'Intermediate', value: 5 },
  { label: 'Advanced', value: 10 },
] as const;

export type SkillLevel = (typeof SKILL_LEVEL_OPTIONS)[number]['value'];

// Game settings
export type GameSettings = {
  color: Side;
  skillLevel: SkillLevel;
};

// Game status and data
export type GameStatus = 'in_progress' | 'win' | 'loss' | 'draw';

export type Game = {
  id: string;
  date: string;
  lastPlayed?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  skillLevel: SkillLevel;
  status: GameStatus;
};

export type GameSortOption = 'lastPlayed' | 'created';
export type SortDirection = 'asc' | 'desc';
