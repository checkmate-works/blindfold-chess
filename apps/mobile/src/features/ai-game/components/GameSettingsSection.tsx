import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  matchDifficultyPreset,
  type DifficultyLevel,
  type PerGamePreferences,
} from "@blindfold-chess/features/game-preferences";
import type { Side } from "@blindfold-chess/types";

import { ListSection, SelectRow } from "../../../components";
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
 * The ladder is one row, like the engine's strength above it: the row shows
 * the active rung and what it does, and tapping it opens a sheet listing
 * the rungs, easiest first, each with its description. The setup screen is
 * passed through before every game, so five rows standing open made it long
 * for a choice that is usually kept from game to game.
 *
 * Picking a rung writes its values into the settings under "Customize" and
 * they stay editable; the rung shown is always read back from them. "Custom"
 * is not a choice in the sheet: the row says it, with its description, when
 * the settings sit on no rung, so the row never shows nothing — the way into
 * it is editing the rows below.
 *
 * The preview stays on the screen, under the row, so a rung's effect shows
 * as soon as the sheet closes. It is left out when the game has no board at
 * all (`boardVisibility: "never"`): there is nothing to draw.
 */
export function GameSettingsSection({
  preferences,
  onChange,
  playerColor,
}: Props) {
  const { t } = useTranslation();
  const activeLevel = matchDifficultyPreset(preferences);
  // aiGame.setup.difficulty.levels.level{1,2,3,4,5}
  const describeLevel = (level: DifficultyLevel) =>
    t(`aiGame.setup.difficulty.levels.level${level}`);
  const formatLevel = (level: DifficultyLevel) =>
    t("aiGame.setup.difficulty.level", { level });

  return (
    <View style={styles.sections}>
      <ListSection title={t("aiGame.setup.difficulty.section")}>
        <SelectRow<DifficultyLevel>
          key="difficulty"
          label={t("aiGame.setup.difficulty.label")}
          options={DIFFICULTY_LEVELS}
          value={activeLevel}
          onChange={(level) => onChange(DIFFICULTY_PRESETS[level])}
          formatOption={formatLevel}
          describeOption={describeLevel}
          valueLabel={
            activeLevel === null
              ? t("aiGame.setup.difficulty.custom")
              : undefined
          }
          subtitle={
            activeLevel === null
              ? t("aiGame.setup.difficulty.customDescription")
              : describeLevel(activeLevel)
          }
          testID="difficulty-row"
          optionTestID="difficulty-level"
        />
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
