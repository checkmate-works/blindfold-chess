import type { AlgebraicNotation, Side, SkillLevel } from './chess';

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
