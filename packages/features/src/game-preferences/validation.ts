import {
  BOARD_THEMES,
  PAWN_HIDE_MODES,
  PIECE_COLOR_MODES,
  PIECE_SHAPE_MODES,
} from "@blindfold-chess/types";

import type { GamePreferences } from "./types";
import {
  BUTTON_INPUT_PIECE_LABELS,
  MOVE_INPUT_MODES,
  type MoveInputMode,
  isAiReplyDuration,
  isBoardVisibility,
  legacyToBoardVisibility,
} from "./values";

function isOneOf<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return (
    typeof value === "string" && (values as readonly string[]).includes(value)
  );
}

/**
 * Validate and sanitise a parsed stored preferences payload.
 *
 * Only picks known keys with valid types / values; unknown keys and invalid
 * values are dropped. Returned as `Partial` so the caller can spread it onto
 * the defaults to fill in keys absent from a partially-written or older
 * payload — {@link resolveStoredGamePreferences} does exactly that.
 */
export function validateGamePreferences(
  parsed: unknown,
): Partial<GamePreferences> {
  if (typeof parsed !== "object" || parsed === null) return {};

  const p = parsed as Record<string, unknown>;
  const result: Partial<GamePreferences> = {};

  if (typeof p.showCoordinates === "boolean")
    result.showCoordinates = p.showCoordinates;
  if (typeof p.highlightLastMove === "boolean")
    result.highlightLastMove = p.highlightLastMove;
  if (typeof p.showPieceDestinations === "boolean")
    result.showPieceDestinations = p.showPieceDestinations;
  if (isOneOf(BOARD_THEMES, p.boardTheme)) result.boardTheme = p.boardTheme;
  if (typeof p.showOwnPieces === "boolean")
    result.showOwnPieces = p.showOwnPieces;
  if (typeof p.showOpponentPieces === "boolean")
    result.showOpponentPieces = p.showOpponentPieces;
  if (isOneOf(PIECE_SHAPE_MODES, p.pieceShapeMode))
    result.pieceShapeMode = p.pieceShapeMode;
  if (isOneOf(PIECE_COLOR_MODES, p.pieceColors))
    result.pieceColors = p.pieceColors;
  if (isOneOf(PAWN_HIDE_MODES, p.pawnHideMode))
    result.pawnHideMode = p.pawnHideMode;
  if (isOneOf(MOVE_INPUT_MODES, p.moveInputMode))
    result.moveInputMode = p.moveInputMode;
  if (Array.isArray(p.enabledMoveInputModes)) {
    const filtered = p.enabledMoveInputModes.filter((m: unknown) =>
      isOneOf(MOVE_INPUT_MODES, m),
    ) as MoveInputMode[];
    if (filtered.length > 0) {
      result.enabledMoveInputModes = filtered;
    }
  }
  if (isOneOf(BUTTON_INPUT_PIECE_LABELS, p.buttonInputPieceLabel))
    result.buttonInputPieceLabel = p.buttonInputPieceLabel;
  if (typeof p.enableAutoComplete === "boolean")
    result.enableAutoComplete = p.enableAutoComplete;
  // boardVisibility migration: accept the 3-state value when present, OR the
  // legacy boolean `showBoardButtonInGame` and translate it. The legacy path
  // is read-side only — the next write emits only the new key. If both
  // co-exist, the new key wins (it was written by post-migration code).
  if (isBoardVisibility(p.boardVisibility)) {
    result.boardVisibility = p.boardVisibility;
  } else if (typeof p.showBoardButtonInGame === "boolean") {
    result.boardVisibility = legacyToBoardVisibility(p.showBoardButtonInGame);
  }
  if (isAiReplyDuration(p.aiReplyDuration)) {
    result.aiReplyDuration = p.aiReplyDuration;
  }
  return result;
}

/**
 * Turn a parsed stored payload into a complete preferences object: validate
 * it, merge it over `defaults`, and repair a `moveInputMode` that is no longer
 * among the enabled modes by switching to the first enabled one (the
 * enabled-modes list and the active mode are stored independently, so an
 * older payload can disagree with itself).
 */
export function resolveStoredGamePreferences(
  parsed: unknown,
  defaults: GamePreferences,
): GamePreferences {
  const merged = { ...defaults, ...validateGamePreferences(parsed) };
  if (!merged.enabledMoveInputModes.includes(merged.moveInputMode)) {
    merged.moveInputMode = merged.enabledMoveInputModes[0];
  }
  return merged;
}
