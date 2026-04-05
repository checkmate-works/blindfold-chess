import type { SkillLevel as AiGameSkillLevel } from '@blindfold-chess/features/ai-game';
import type { AlgebraicNotation, GameOutcome, Side } from '@blindfold-chess/types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

// Re-export the canonical SkillLevel type from @blindfold-chess/features
export type SkillLevel = AiGameSkillLevel;

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

// Re-export the canonical GameOutcome type from @blindfold-chess/types
export type { GameOutcome } from '@blindfold-chess/types';

export type MoveInputMethod = 'text' | 'text-autocomplete' | 'select' | 'button';

export type MoveOperationLog = {
  inputMethod: MoveInputMethod;
  peekCount: number;
  undoCount: number;
  movePeekCount: number;
};

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
  /** Per-game preferences saved at game start. If undefined, global preferences are used. */
  gamePreferences?: PerGamePreferences;
  /** Per-move operation logs for player moves. Each entry corresponds to one player move. */
  operationLogs?: MoveOperationLog[];
};

export type GameSortOption = 'lastPlayed' | 'created';
export type SortDirection = 'asc' | 'desc';
