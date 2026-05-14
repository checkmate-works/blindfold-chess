import type { SkillLevel as AiGameSkillLevel } from '@blindfold-chess/features/ai-game';
import type { AlgebraicNotation, GameOutcome, Side } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

// Re-export the canonical SkillLevel type from @blindfold-chess/features
export type SkillLevel = AiGameSkillLevel;

// Re-export the canonical GameOutcome type from @blindfold-chess/types
export type { GameOutcome } from '@blindfold-chess/types';

export type MoveInputMethod = 'text' | 'text-autocomplete' | 'select' | 'button';

export type MoveOperationLog = {
  inputMethod: MoveInputMethod;
  peekCount: number;
  undoCount: number;
  movePeekCount: number;
};

/**
 * In-app domain shape for a saved game. `engineConfig` is always
 * present here — legacy records on disk (which only carry
 * `skillLevel`) are normalised into a `{ kind: 'stockfish', skillLevel }`
 * config by `LocalStorageGameRepository` before they reach this type,
 * so consumers never need to handle the legacy form.
 */
export type Game = {
  id: string;
  date: string;
  lastPlayed?: string;
  moves: AlgebraicNotation[];
  playerColor: Side;
  engineConfig: EngineConfig;
  status: GameOutcome;
  /** Custom starting position FEN. If undefined, standard starting position is used. */
  startingFen?: string;
  /** Per-game preferences saved at game start. If undefined, global preferences are used. */
  gamePreferences?: PerGamePreferences;
  /** Per-move operation logs for player moves. Each entry corresponds to one player move. */
  operationLogs?: MoveOperationLog[];
};

/**
 * Wire shape used by `LocalStorageGameRepository` when reading
 * existing records. Pre-EngineConfig data carries `skillLevel` as a
 * top-level number and has no `engineConfig`; newer writes emit
 * `engineConfig` only. The repository accepts either form and
 * normalises to {@link Game} on read — this type exists solely so the
 * adapter can be expressed without `any`.
 */
export type StoredGame = Omit<Game, 'engineConfig'> & {
  /** Legacy field. Only Stockfish games written before the EngineConfig migration carry it. */
  skillLevel?: SkillLevel;
  /** New field. Written for every Stockfish or Maia game after the migration. */
  engineConfig?: EngineConfig;
};

export type GameSortOption = 'lastPlayed' | 'created';
export type SortDirection = 'asc' | 'desc';
