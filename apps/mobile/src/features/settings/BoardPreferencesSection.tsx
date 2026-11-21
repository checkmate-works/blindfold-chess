import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  BOARD_THEMES,
  PAWN_HIDE_MODES,
  PIECE_COLOR_MODES,
  PIECE_SHAPE_MODES,
} from "@blindfold-chess/types";
import {
  BOARD_VISIBILITY_VALUES,
  BUTTON_INPUT_PIECE_LABELS,
  type GamePreferences,
  type MoveInputMode,
} from "@blindfold-chess/features/game-preferences";

import { ListRow, ListSection, SelectRow, SwitchRow } from "../../components";
import { useGamePreferences } from "../../lib/game-preferences";
import { useTheme, fontSize, fontWeight, spacing } from "../../theme";
import { MOBILE_MOVE_INPUT_MODES } from "./mobile-move-input-modes";

/**
 * The web's piece-visibility picker: one choice of which side's pieces are
 * shown, written to the two independent booleans. Hiding both sides at once
 * is not offered (the board would be empty — `boardVisibility: 'never'` is
 * the way to get that), so a stored both-hidden state simply selects no chip.
 */
const PIECE_VISIBILITY_MODES = ["all", "own", "opponent"] as const;
type PieceVisibilityMode = (typeof PIECE_VISIBILITY_MODES)[number];

function pieceVisibilityMode(
  preferences: Pick<GamePreferences, "showOwnPieces" | "showOpponentPieces">,
): PieceVisibilityMode | null {
  const { showOwnPieces, showOpponentPieces } = preferences;
  if (showOwnPieces && showOpponentPieces) return "all";
  if (showOwnPieces) return "own";
  if (showOpponentPieces) return "opponent";
  return null;
}

function pieceVisibilityUpdate(
  mode: PieceVisibilityMode,
): Pick<GamePreferences, "showOwnPieces" | "showOpponentPieces"> {
  return {
    showOwnPieces: mode !== "opponent",
    showOpponentPieces: mode !== "own",
  };
}

/**
 * The board-preferences block of the settings tab: everything the mobile
 * boards and move input currently honour. Each option list reads its labels
 * from `settings.board.*`; the keys built from a value are listed beside each
 * field so a grep for the full key finds them.
 */
export function BoardPreferencesSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { preferences, updatePreferences, resetPreferences } =
    useGamePreferences();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {t("settings.board.title")}
      </Text>
      <ListSection>
        {/* settings.board.boardVisibilities.{always,peek,never} */}
        <SelectRow
          label={t("settings.board.boardVisibility")}
          options={BOARD_VISIBILITY_VALUES}
          value={preferences.boardVisibility}
          onChange={(boardVisibility) => updatePreferences({ boardVisibility })}
          formatOption={(v) => t(`settings.board.boardVisibilities.${v}`)}
        />
        <SwitchRow
          label={t("settings.board.showCoordinates")}
          value={preferences.showCoordinates}
          onChange={(showCoordinates) => updatePreferences({ showCoordinates })}
        />
        <SwitchRow
          label={t("settings.board.highlightLastMove")}
          value={preferences.highlightLastMove}
          onChange={(highlightLastMove) =>
            updatePreferences({ highlightLastMove })
          }
        />
        {/* settings.board.boardThemes.{monotone,lichess,chesscom} */}
        <SelectRow
          label={t("settings.board.boardTheme")}
          options={BOARD_THEMES}
          value={preferences.boardTheme}
          onChange={(boardTheme) => updatePreferences({ boardTheme })}
          formatOption={(v) => t(`settings.board.boardThemes.${v}`)}
        />
        {/* settings.board.pieceVisibilityModes.{all,own,opponent} */}
        <SelectRow<PieceVisibilityMode>
          label={t("settings.board.pieceVisibility")}
          options={PIECE_VISIBILITY_MODES}
          value={pieceVisibilityMode(preferences)}
          onChange={(mode) => updatePreferences(pieceVisibilityUpdate(mode))}
          formatOption={(v) => t(`settings.board.pieceVisibilityModes.${v}`)}
        />
        {/* settings.board.pieceShapeModes.{normal,circles-all,circles-own,circles-opponent} */}
        <SelectRow
          label={t("settings.board.showAsStones")}
          options={PIECE_SHAPE_MODES}
          value={preferences.pieceShapeMode}
          onChange={(pieceShapeMode) => updatePreferences({ pieceShapeMode })}
          formatOption={(v) => t(`settings.board.pieceShapeModes.${v}`)}
        />
        {/* settings.board.pieceColorModes.{normal,white-only,black-only} */}
        <SelectRow
          label={t("settings.board.pieceColor")}
          options={PIECE_COLOR_MODES}
          value={preferences.pieceColors}
          onChange={(pieceColors) => updatePreferences({ pieceColors })}
          formatOption={(v) => t(`settings.board.pieceColorModes.${v}`)}
        />
        {/* settings.board.pawnHideModes.{none,all,own,opponent} */}
        <SelectRow
          label={t("settings.board.hidePawns")}
          options={PAWN_HIDE_MODES}
          value={preferences.pawnHideMode}
          onChange={(pawnHideMode) => updatePreferences({ pawnHideMode })}
          formatOption={(v) => t(`settings.board.pawnHideModes.${v}`)}
        />
        {/* settings.board.moveInputModes.button */}
        <SelectRow<MoveInputMode>
          label={t("settings.board.moveInput")}
          options={MOBILE_MOVE_INPUT_MODES}
          value={preferences.moveInputMode}
          onChange={(moveInputMode) => updatePreferences({ moveInputMode })}
          formatOption={(v) => t(`settings.board.moveInputModes.${v}`)}
        />
        {/* settings.board.buttonLabels.{text,icon} */}
        <SelectRow
          label={t("settings.board.buttonLabelStyle")}
          options={BUTTON_INPUT_PIECE_LABELS}
          value={preferences.buttonInputPieceLabel}
          onChange={(buttonInputPieceLabel) =>
            updatePreferences({ buttonInputPieceLabel })
          }
          formatOption={(v) => t(`settings.board.buttonLabels.${v}`)}
        />
      </ListSection>
      <ListSection>
        <ListRow
          title={t("settings.board.resetDefaults")}
          accessory="none"
          onPress={resetPreferences}
        />
      </ListSection>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.md,
  },
});
