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
 * Discriminated entry for the mid-game per-game-preferences change log.
 * Each entry records one user-initiated edit of one preference field. The
 * `key` discriminator pairs `from`/`to` types tightly so the storage shape
 * cannot mix a boolean key with an enum value or vice versa.
 *
 * `atMoveIndex` is the value of `moves.length` at the time of the change
 * (i.e. the number of half-moves already played). It is intentionally NOT
 * tied to the player's move index — preferences can be changed between AI
 * thinking and the next player turn, so the half-move count is the only
 * unambiguous anchor.
 */
export type PreferenceChangeLogEntry =
  | {
      atMoveIndex: number;
      key: 'highlightLastMove' | 'showOwnPieces' | 'showOpponentPieces';
      from: boolean;
      to: boolean;
    }
  | {
      atMoveIndex: number;
      key: 'pieceShapeMode';
      from: PerGamePreferences['pieceShapeMode'];
      to: PerGamePreferences['pieceShapeMode'];
    }
  | {
      atMoveIndex: number;
      key: 'pieceColors';
      from: PerGamePreferences['pieceColors'];
      to: PerGamePreferences['pieceColors'];
    }
  | {
      atMoveIndex: number;
      key: 'peekMode';
      from: PerGamePreferences['peekMode'];
      to: PerGamePreferences['peekMode'];
    }
  | {
      atMoveIndex: number;
      key: 'boardVisibility';
      from: PerGamePreferences['boardVisibility'];
      to: PerGamePreferences['boardVisibility'];
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
  /**
   * Per-game preferences snapshot captured at game start. Immutable for the
   * life of the game — mid-game edits do NOT overwrite this field; they
   * accumulate in {@link preferenceChangeLog} instead. The current effective
   * values are derived by folding the log on top of this snapshot.
   * Undefined for the brief pre-Phase-1 era; consumers treat undefined as
   * "no snapshot recorded" and fall back to global preferences for display.
   */
  gamePreferences?: PerGamePreferences;
  /**
   * Append-only timeline of mid-game preference edits. Each entry records
   * one field change with `atMoveIndex` = `moves.length` at the time of
   * the edit. Undefined or empty when the player did not change any
   * settings mid-game (the overwhelmingly common case). Folding this log
   * over {@link gamePreferences} yields the current effective values.
   */
  preferenceChangeLog?: PreferenceChangeLogEntry[];
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
