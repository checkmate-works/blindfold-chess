import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { BOARD_THEMES } from "@blindfold-chess/types";
import {
  BUTTON_INPUT_PIECE_LABELS,
  type MoveInputMode,
} from "@blindfold-chess/features/game-preferences";

import { ListRow, ListSection, SelectRow, SwitchRow } from "../../components";
import { useGamePreferences } from "../../lib/game-preferences";
import { spacing } from "../../theme";
import { MOBILE_MOVE_INPUT_MODES } from "./mobile-move-input-modes";
import { perGameSettingRows } from "./per-game-setting-rows";

/**
 * The board-preferences block of the settings tab: everything the mobile
 * boards and move input currently honour: the per-game rows first (the
 * values a new AI game starts from), then what is only ever global. Each
 * option list reads its labels from `settings.board.*`; the keys built from a
 * value are listed beside each field so a grep for the full key finds them.
 */
export function BoardPreferencesSection() {
  const { t } = useTranslation();
  const { preferences, updatePreferences, resetPreferences } =
    useGamePreferences();

  return (
    <View style={styles.section}>
      <ListSection title={t("settings.board.title")}>
        {perGameSettingRows({
          t,
          preferences,
          onChange: updatePreferences,
        })}
        <SwitchRow
          label={t("settings.board.showCoordinates")}
          value={preferences.showCoordinates}
          onChange={(showCoordinates) => updatePreferences({ showCoordinates })}
        />
        {/* settings.board.boardThemes.{monotone,lichess,chesscom} */}
        <SelectRow
          label={t("settings.board.boardTheme")}
          options={BOARD_THEMES}
          value={preferences.boardTheme}
          onChange={(boardTheme) => updatePreferences({ boardTheme })}
          formatOption={(v) => t(`settings.board.boardThemes.${v}`)}
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
});
