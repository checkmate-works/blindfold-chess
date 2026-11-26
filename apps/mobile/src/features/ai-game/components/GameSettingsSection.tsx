import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  matchDifficultyPreset,
  type PerGamePreferences,
} from "@blindfold-chess/features/game-preferences";
import type { Side } from "@blindfold-chess/types";

import { ListRow, ListSection } from "../../../components";
import { spacing } from "../../../theme";
import { perGameSettingRows } from "../../settings/per-game-setting-rows";
import { BoardPreview } from "./BoardPreview";

type Props = {
  preferences: PerGamePreferences;
  onChange: (updates: Partial<PerGamePreferences>) => void;
  /** The side the player will play, which the preview is seen from. */
  playerColor: Side;
};

/**
 * How blind this game is played, in the web's order: the difficulty ladder,
 * a preview of the board it gives, then the settings a rung is made of.
 *
 * The ladder is one row per level, easiest first, each with what it does and
 * a check on the active one. Picking a rung writes its values into the
 * settings under "Customize" and they stay editable; the rung checked is
 * always read back from them. "Custom" is not a choice: it appears, already
 * checked, only when the settings sit on no rung, so the ladder never shows
 * nothing selected — the way into it is editing the rows below.
 *
 * The preview stays in the ladder's panel so a rung's effect shows right
 * under the row just tapped. It is left out when the game has no board at
 * all (`boardVisibility: "never"`): there is nothing to draw.
 */
export function GameSettingsSection({
  preferences,
  onChange,
  playerColor,
}: Props) {
  const { t } = useTranslation();
  const activeLevel = matchDifficultyPreset(preferences);

  return (
    <View style={styles.sections}>
      <ListSection title={t("common.gameSettings")}>
        {DIFFICULTY_LEVELS.map((level) => (
          <ListRow
            key={level}
            title={t("aiGame.setup.difficulty.level", { level })}
            // aiGame.setup.difficulty.levels.level{1,2,3,4,5}
            subtitle={t(`aiGame.setup.difficulty.levels.level${level}`)}
            accessory={level === activeLevel ? "check" : "none"}
            onPress={() => onChange(DIFFICULTY_PRESETS[level])}
            testID={`difficulty-level-${level}`}
          />
        ))}
        {activeLevel === null && (
          <ListRow
            key="custom"
            title={t("aiGame.setup.difficulty.custom")}
            subtitle={t("aiGame.setup.difficulty.customDescription")}
            accessory="check"
            testID="difficulty-custom"
          />
        )}
        {preferences.boardVisibility !== "never" && (
          <BoardPreview
            key="preview"
            preferences={preferences}
            playerColor={playerColor}
          />
        )}
      </ListSection>
      <ListSection title={t("aiGame.setup.difficulty.customize")}>
        {perGameSettingRows({ t, preferences, onChange })}
      </ListSection>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: spacing.lg,
  },
});
