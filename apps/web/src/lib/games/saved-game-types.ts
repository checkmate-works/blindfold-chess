import type { SkillLevel as AiGameSkillLevel } from '@blindfold-chess/features/ai-game';
import type { AlgebraicNotation, GameOutcome, Side } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { BoardVisibility } from './board-visibility';

/**
 * The blindfold difficulty settings shown on a published game — the
 * display-relevant subset of {@link PerGamePreferences}, validated and stored
 * in `games.play_settings`. Kept as its own type (not the full preferences
 * blob) so only known, validated fields are persisted; new fields can be added
 * later without a migration since the column is JSONB.
 */
export type GamePlaySettings = {
  boardVisibility: BoardVisibility;
  showOwnPieces: boolean;
  showOpponentPieces: boolean;
  pieceShapeMode: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors: 'normal' | 'white-only' | 'black-only';
};

/**
 * One mid-game edit of a display-relevant blindfold setting, persisted on a
 * published game so the replay can show "what the player saw at this position"
 * as it steps through the moves.
 *
 * The display-only projection of {@link PreferenceChangeLogEntry}: it keeps just
 * the keys {@link GamePlaySettings} renders (board visibility + which side was
 * shown + piece shape/color) and only the `to` value (the new value the change
 * established) — folding forward never needs `from`. `atMoveIndex` is
 * `moves.length` at the time of the change (half-moves already played), so the
 * effective settings at a given position are {@link GamePlaySettings} (the
 * start-of-game snapshot) with every entry whose `atMoveIndex <= half-moves
 * shown` applied in order. Stored in `games.play_settings_log`.
 */
export type PlaySettingsChangeEntry =
  | { atMoveIndex: number; key: 'showOwnPieces' | 'showOpponentPieces'; to: boolean }
  | { atMoveIndex: number; key: 'pieceShapeMode'; to: GamePlaySettings['pieceShapeMode'] }
  | { atMoveIndex: number; key: 'pieceColors'; to: GamePlaySettings['pieceColors'] }
  | { atMoveIndex: number; key: 'boardVisibility'; to: BoardVisibility };

// Re-export the canonical SkillLevel type from @blindfold-chess/features
export type SkillLevel = AiGameSkillLevel;

// Re-export the canonical GameOutcome type from @blindfold-chess/types
export type { GameOutcome } from '@blindfold-chess/types';

export type MoveInputMethod = 'text' | 'text-autocomplete' | 'select' | 'button' | 'board';

export type MoveOperationLog = {
  inputMethod: MoveInputMethod;
  peekCount: number;
  undoCount: number;
  movePeekCount: number;
  /**
   * Number of invalid-move submission attempts since the previous commit.
   * Optional for backward compatibility — entries written before this field
   * existed are treated as 0 by consumers. Counts only failed
   * MoveInputPanel submissions (text / select / button paths); board moves
   * (click-to-move / drag-and-drop) never submit illegal moves because the
   * board only fires `onMove` for legal destinations.
   */
  invalidCount?: number;
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
      key: 'highlightLastMove' | 'showPieceDestinations' | 'showOwnPieces' | 'showOpponentPieces';
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
      key: 'boardVisibility';
      from: PerGamePreferences['boardVisibility'];
      to: PerGamePreferences['boardVisibility'];
    }
  | {
      atMoveIndex: number;
      key: 'moveInputMode';
      from: PerGamePreferences['moveInputMode'];
      to: PerGamePreferences['moveInputMode'];
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
