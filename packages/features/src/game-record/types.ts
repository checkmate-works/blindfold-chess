/**
 * Saved-game record types shared by web and mobile: the game itself, its
 * per-game preference snapshot and change log, and the game-operation audit
 * record (peeks, undos, invalid move attempts).
 *
 * The audit record is three records with different mutation rules:
 * {@link MoveOperationLog}[] is the display record (one entry per committed
 * player move; an undo deletes the entry, as if the move never happened),
 * {@link OperationTotals} is the monotonic count ledger (bumped when each
 * operation happens, never decremented, so peek → undo → replay cannot launder
 * aid usage), and {@link UndoneMoveLog}[] archives whatever a rollback removes
 * from the display record. A rollback moves information between them; it
 * never destroys it.
 */
import type {
  AlgebraicNotation,
  GameOutcome,
  PawnHideMode,
  PieceColorMode,
  PieceShapeMode,
  Side,
} from "@blindfold-chess/types";

import type { EngineConfig } from "../ai-game/engine-config";
import type { SkillLevel } from "../ai-game/types";
import type { MoveSquares } from "../board-display/types";
import type { PerGamePreferences } from "../game-preferences/types";
import type { BoardVisibility } from "../game-preferences/values";
import type { MoveInputMethod } from "./move-operation-log";

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
  pieceShapeMode: PieceShapeMode;
  pieceColors: PieceColorMode;
  pawnHideMode: PawnHideMode;
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
  | {
      atMoveIndex: number;
      key: "showOwnPieces" | "showOpponentPieces";
      to: boolean;
    }
  | {
      atMoveIndex: number;
      key: "pieceShapeMode";
      to: GamePlaySettings["pieceShapeMode"];
    }
  | {
      atMoveIndex: number;
      key: "pieceColors";
      to: GamePlaySettings["pieceColors"];
    }
  | {
      atMoveIndex: number;
      key: "pawnHideMode";
      to: GamePlaySettings["pawnHideMode"];
    }
  | { atMoveIndex: number; key: "boardVisibility"; to: BoardVisibility };

export type MoveOperationLog = {
  inputMethod: MoveInputMethod;
  peekCount: number;
  undoCount: number;
  movePeekCount: number;
  /**
   * Number of invalid-move submission attempts since the previous commit.
   * Optional for backward compatibility — entries written before this field
   * existed are treated as 0 by consumers. Counts both MoveInputPanel
   * rejections (text / select / button) and board rejections (click-to-move
   * onto an illegal destination after a selection, or any drag-drop onto an
   * illegal square) — a bare opponent-piece *first tap* is the one board
   * interaction that never counts, since it selects nothing and names no
   * move (see `classifyBoardClick`).
   */
  invalidCount?: number;
  /**
   * The actual rejected move texts behind {@link invalidCount}, in attempt
   * order (e.g. `['Nf3', 'Bb4']`) — so a review can show *what* was tried, not
   * just how many times. Both input paths populate this: MoveInputPanel with
   * the submitted SAN, and the board with a synthesized SAN-like label
   * (`describeIllegalAttempt`) built from the selected piece and destination.
   * `invalidAttempts.length` may still be < `invalidCount` for a record
   * written before board attempts were captured this way. Omitted
   * (undefined) when empty and on legacy records — consumers fall back to
   * the bare count.
   */
  invalidAttempts?: string[];
  /**
   * The exact origin/destination squares behind each {@link invalidAttempts}
   * entry, same indexing, when the interaction that produced it directly
   * knew them — i.e. only board attempts (click-to-move / drag-drop): the
   * board always has both squares in hand at rejection time. A MoveInputPanel
   * attempt has no board interaction to derive squares from, so its slot is
   * `null`; a mixed turn (some board mis-clicks, some typed attempts before
   * the eventual commit) can have both kinds of slot in the same array.
   *
   * This exists because {@link invalidAttempts}' SAN-like text is lossy by
   * design for board attempts — `describeIllegalAttempt` deliberately omits
   * disambiguation (a same-type sibling piece is moot for an illegal move),
   * so the origin square cannot be recovered by re-parsing the text once
   * more than one piece of that type could be the mover. Capturing it here
   * at record time — where it is unambiguous — avoids that guesswork
   * downstream (e.g. the "as played" GIF replay, which marks both squares
   * of a rejected board attempt rather than only the destination).
   */
  invalidAttemptSquares?: (MoveSquares | null)[];
};

/**
 * One per-move log record discarded by a player rollback (Undo or
 * restart-from-position), archived so the rollback erases nothing from the
 * audit record — {@link OperationTotals} keeps the counts, this keeps the
 * detail (issue #95: notably the rejected SAN texts, which counts alone
 * cannot reconstruct).
 *
 * Two kinds of loss feed it:
 * - A committed entry removed from `operationLogs` → archived as `log`,
 *   with `index` = the operationLogs position it occupied.
 * - Rejected attempts typed after the last commit and discarded before any
 *   commit → archived as `pendingInvalidAttempts`. When `log` is present
 *   they belong to the NEXT move slot (`index + 1`); on a pending-only
 *   record `index` is the slot the uncommitted move would have taken.
 *
 * Capped per game (see the tracker) so pathological undo streaks cannot
 * bloat the record; totals keep counting past the cap.
 */
export type UndoneMoveLog = {
  index: number;
  log?: MoveOperationLog;
  pendingInvalidAttempts?: string[];
  /**
   * The SAN(s) this undo retracted from `moves[]`, in board order (the
   * player's move, then the AI's reply). Only the Undo button records this
   * (restart-from-position does not — see the web tracker's `handleUndoLog`), and only
   * once `moves[]` was still in scope to slice, so it is absent on records
   * from before this field existed and whenever the retraction wasn't via
   * Undo. Lets a "played" GIF re-enact the retracted move instead of only
   * badging it (falls back to a badge when absent, or when the SAN turns
   * out to be illegal against the position it would replay from).
   */
  sans?: string[];
};

/**
 * Game-lifetime monotonic operation counters.
 *
 * {@link MoveOperationLog} entries follow the "undo = the move never happened"
 * principle: undoing a move deletes its log line, peeks and all. That is right
 * for display, but it lets a player launder aid usage — peek → undo → replay
 * keeps the visible peek sum at 0 no matter how often the board was checked
 * (issue #95). These totals close that hole: every counter only ever
 * increases for the life of the game, counting each operation at the moment
 * it happens, so undo/restart can never subtract from them.
 *
 * Per-move logs stay the display source of truth; totals are the audit and
 * promotion-eligibility source (the 1dan hidden-board evaluator reads
 * `peeks`). `undefined` on records saved before this field existed —
 * consumers derive a lossy baseline via `sumOperationLogs` or treat the game
 * as legacy (see the rank evaluator's fail-closed handling).
 */
export type OperationTotals = {
  peeks: number;
  movePeeks: number;
  undos: number;
  invalidMoves: number;
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
      key:
        | "highlightLastMove"
        | "showPieceDestinations"
        | "showOwnPieces"
        | "showOpponentPieces";
      from: boolean;
      to: boolean;
    }
  | {
      atMoveIndex: number;
      key: "pieceShapeMode";
      from: PerGamePreferences["pieceShapeMode"];
      to: PerGamePreferences["pieceShapeMode"];
    }
  | {
      atMoveIndex: number;
      key: "pieceColors";
      from: PerGamePreferences["pieceColors"];
      to: PerGamePreferences["pieceColors"];
    }
  | {
      atMoveIndex: number;
      key: "pawnHideMode";
      from: PerGamePreferences["pawnHideMode"];
      to: PerGamePreferences["pawnHideMode"];
    }
  | {
      atMoveIndex: number;
      key: "boardVisibility";
      from: PerGamePreferences["boardVisibility"];
      to: PerGamePreferences["boardVisibility"];
    }
  | {
      atMoveIndex: number;
      key: "moveInputMode";
      from: PerGamePreferences["moveInputMode"];
      to: PerGamePreferences["moveInputMode"];
    }
  | {
      atMoveIndex: number;
      key: "aiReplyDuration";
      from: PerGamePreferences["aiReplyDuration"];
      to: PerGamePreferences["aiReplyDuration"];
    };

/**
 * In-app domain shape for a saved game. `engineConfig` is always
 * present here — legacy records on disk (which only carry
 * `skillLevel`) are normalised into a `{ kind: 'stockfish', skillLevel }`
 * config by the storage adapter (web: `LocalStorageGameRepository`) before they reach this type,
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
   * How many leading entries of {@link moves} were pre-played at setup (an
   * opening line or a pasted PGN) rather than played in-session. Together with
   * {@link startingFen} this reconstructs the position the player actually
   * started from — `startingFen` alone cannot: opening/PGN starts keep the
   * standard start and seed `moves` instead. Also the offset that aligns
   * {@link operationLogs} (one entry per in-session player move) with `moves`.
   * Undefined on legacy records and plain standard-start games — both mean
   * "no seeded prefix" (0) to consumers. Undo / restart-from-position can
   * shrink it (the player took over earlier); it never grows back.
   */
  setupPlies?: number;
  /**
   * Per-game preferences snapshot captured at game start. Immutable for the
   * life of the game — mid-game edits do NOT overwrite this field; they
   * accumulate in {@link preferenceChangeLog} instead. The current effective
   * values are derived by folding the log on top of this snapshot.
   * Undefined on games saved before the snapshot existed; consumers treat undefined as
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
  /**
   * Monotonic game-lifetime counters — see {@link OperationTotals}. Unlike
   * {@link operationLogs}, undo and restart-from-position never shrink these.
   * Undefined on records saved before the field existed.
   */
  operationTotals?: OperationTotals;
  /**
   * Per-move log records discarded by Undo / restart-from-position — see
   * {@link UndoneMoveLog}. Append-only, capped. Undefined on records saved
   * before the field existed and on games with no rollbacks.
   */
  undoneLogs?: UndoneMoveLog[];
  /**
   * The Maia coin charge this game was started on — the client-minted UUID
   * `startMaiaGame` keyed the `maia_game` ledger row on. Captured from the
   * play URL on the first save and fixed for the life of the game; forwarded
   * at publish so the coin history can link the charge to the game.
   * Undefined for Stockfish games and for Maia games started before the
   * param existed.
   */
  maiaChargeId?: string;
};

/**
 * Wire shape used by the storage adapter (web: `LocalStorageGameRepository`) when reading
 * existing records. Pre-EngineConfig data carries `skillLevel` as a
 * top-level number and has no `engineConfig`; newer writes emit
 * `engineConfig` only. The repository accepts either form and
 * normalises to {@link Game} on read — this type exists solely so the
 * adapter can be expressed without `any`.
 */
export type StoredGame = Omit<Game, "engineConfig"> & {
  /** Legacy field. Only Stockfish games written before the EngineConfig migration carry it. */
  skillLevel?: SkillLevel;
  /** New field. Written for every Stockfish or Maia game after the migration. */
  engineConfig?: EngineConfig;
};

export type GameSortOption = "lastPlayed" | "created";
export type SortDirection = "asc" | "desc";
