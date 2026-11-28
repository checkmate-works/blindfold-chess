import type { ReactElement } from "react";
import type { TFunction } from "i18next";
import {
  PAWN_HIDE_MODES,
  PIECE_COLOR_MODES,
  PIECE_SHAPE_MODES,
} from "@blindfold-chess/types";
import {
  AI_REPLY_DURATION_KEEP,
  AI_REPLY_DURATION_VALUES,
  BOARD_VISIBILITY_VALUES,
  PIECE_VISIBILITY_MODES,
  PIECE_VISIBILITY_PRESETS,
  type PerGamePreferences,
  type PieceVisibilityMode,
} from "@blindfold-chess/features/game-preferences";

import { SelectRow, SwitchRow } from "../../components";

/**
 * The piece-visibility choice the two stored booleans amount to. Hiding both
 * sides at once is not one of the choices, so a stored both-hidden state
 * simply selects no chip.
 */
function pieceVisibilityMode(
  preferences: Pick<PerGamePreferences, "showOwnPieces" | "showOpponentPieces">,
): PieceVisibilityMode | null {
  const { showOwnPieces, showOpponentPieces } = preferences;
  if (showOwnPieces && showOpponentPieces) return "all";
  if (showOwnPieces) return "own";
  if (showOpponentPieces) return "opponent";
  return null;
}

type Options = {
  t: TFunction;
  preferences: PerGamePreferences;
  onChange: (updates: Partial<PerGamePreferences>) => void;
};

/**
 * The rows a difficulty level is made of: how much of the board and which
 * pieces are shown, and how. Picking a level sets exactly these
 * (`DIFFICULTY_PRESETS`), and the level shown is read back from them, so
 * changing one of them by hand is what turns the level into "Custom".
 *
 * Returned as keyed elements to be the children of a `ListSection`: it draws
 * a separator between its direct children, and a component returning a
 * fragment would count as one row. Each option list reads its labels from
 * `settings.board.*`; the keys built from a value are listed beside each row
 * so a grep for the full key finds them.
 */
export function difficultySettingRows({
  t,
  preferences,
  onChange,
}: Options): ReactElement[] {
  return [
    // settings.board.boardVisibilities.{always,peek,never}
    <SelectRow
      key="boardVisibility"
      label={t("settings.board.boardVisibility")}
      options={BOARD_VISIBILITY_VALUES}
      value={preferences.boardVisibility}
      onChange={(boardVisibility) => onChange({ boardVisibility })}
      formatOption={(v) => t(`settings.board.boardVisibilities.${v}`)}
    />,
    // settings.board.pieceVisibilityModes.{all,own,opponent}
    <SelectRow<PieceVisibilityMode>
      key="pieceVisibility"
      label={t("settings.board.pieceVisibility")}
      options={PIECE_VISIBILITY_MODES}
      value={pieceVisibilityMode(preferences)}
      onChange={(mode) => onChange(PIECE_VISIBILITY_PRESETS[mode])}
      formatOption={(v) => t(`settings.board.pieceVisibilityModes.${v}`)}
    />,
    // settings.board.pieceShapeModes.{normal,circles-all,circles-own,circles-opponent}
    <SelectRow
      key="pieceShapeMode"
      label={t("settings.board.showAsStones")}
      options={PIECE_SHAPE_MODES}
      value={preferences.pieceShapeMode}
      onChange={(pieceShapeMode) => onChange({ pieceShapeMode })}
      formatOption={(v) => t(`settings.board.pieceShapeModes.${v}`)}
    />,
    // settings.board.pieceColorModes.{normal,white-only,black-only}
    <SelectRow
      key="pieceColors"
      label={t("settings.board.pieceColor")}
      options={PIECE_COLOR_MODES}
      value={preferences.pieceColors}
      onChange={(pieceColors) => onChange({ pieceColors })}
      formatOption={(v) => t(`settings.board.pieceColorModes.${v}`)}
    />,
    // settings.board.pawnHideModes.{none,all,own,opponent}
    <SelectRow
      key="pawnHideMode"
      label={t("settings.board.hidePawns")}
      options={PAWN_HIDE_MODES}
      value={preferences.pawnHideMode}
      onChange={(pawnHideMode) => onChange({ pawnHideMode })}
      formatOption={(v) => t(`settings.board.pawnHideModes.${v}`)}
    />,
  ];
}

/**
 * The per-game rows no difficulty level touches: how the AI's move is
 * announced and what the board marks while playing. Changing them never
 * makes the level "Custom", so they sit apart from the level's rows.
 */
export function inGameDisplayRows({
  t,
  preferences,
  onChange,
}: Options): ReactElement[] {
  return [
    <SelectRow
      key="aiReplyDuration"
      label={t("settings.board.aiReplyDuration")}
      options={AI_REPLY_DURATION_VALUES}
      value={preferences.aiReplyDuration}
      onChange={(aiReplyDuration) => onChange({ aiReplyDuration })}
      formatOption={(ms) =>
        ms === AI_REPLY_DURATION_KEEP
          ? t("settings.board.aiReplyDurationModes.keep")
          : t("settings.board.aiReplyDurationModes.seconds", {
              seconds: ms / 1000,
            })
      }
    />,
    <SwitchRow
      key="highlightLastMove"
      label={t("settings.board.highlightLastMove")}
      value={preferences.highlightLastMove}
      onChange={(highlightLastMove) => onChange({ highlightLastMove })}
    />,
    <SwitchRow
      key="showPieceDestinations"
      label={t("settings.board.showPieceDestinations")}
      value={preferences.showPieceDestinations}
      onChange={(showPieceDestinations) => onChange({ showPieceDestinations })}
    />,
  ];
}

/**
 * Every row for the preferences one game snapshots, the level's rows first.
 * The settings tab edits the global values with them and the AI game's gear
 * edits the game's copy mid-game, so both offer the same choices in the same
 * words and order as the setup screen, which shows the two groups under
 * headings of their own.
 */
export function perGameSettingRows(options: Options): ReactElement[] {
  return [...difficultySettingRows(options), ...inGameDisplayRows(options)];
}
