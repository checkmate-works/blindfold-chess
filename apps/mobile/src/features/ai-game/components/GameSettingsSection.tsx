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
import {
  difficultySettingRows,
  inGameDisplayRows,
} from "../../settings/per-game-setting-rows";
import { BoardPreview } from "./BoardPreview";

type Props = {
  preferences: PerGamePreferences;
  onChange: (updates: Partial<PerGamePreferences>) => void;
  /** The side the player will play, which the preview is seen from. */
  playerColor: Side;
};

/**
 * How blind this game is played, in the web's order: the difficulty level,
 * a preview of the board it gives, the rows a level is made of, then the
 * rows no level touches.
 *
 * The level is one row, like the engine's strength above it: the row shows
 * the active level and what it does, and tapping it opens a sheet listing
 * the levels, easiest first, each with its description. The setup screen is
 * passed through before every game, so five rows standing open made it long
 * for a choice that is usually kept from game to game.
 *
 * A level is a template for the rows under "Level settings": picking one
 * writes its values there, and they stay editable; the level shown is always
 * read back from them. The screen makes that cause and effect visible rather
 * than leaving it to be discovered: those rows sit in a section of their own
 * right under the level, the rows a level never sets (the AI move's
 * announcement, the last-move highlight, the move dots) are apart under
 * "During the game", since changing them never makes the level "Custom", and
 * a note under the level says both halves in one sentence.
 *
 * "Custom" is not a choice in the sheet: the row says it, with its
 * description, when the level rows match no level, so the row never shows
 * nothing. Picking a level then replaces those hand-made changes, so the
 * sheet says so above the levels while the row shows "Custom".
 *
 * The preview stays on the screen, under the row, so a level's effect shows
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
      <ListSection
        title={t("aiGame.setup.difficulty.section")}
        footer={t("aiGame.setup.difficulty.footer")}
      >
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
          description={
            activeLevel === null
              ? t("aiGame.setup.difficulty.overwriteNote")
              : undefined
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
      <ListSection title={t("aiGame.setup.difficulty.contents")}>
        {difficultySettingRows({ t, preferences, onChange })}
      </ListSection>
      <ListSection title={t("aiGame.setup.display")}>
        {inGameDisplayRows({ t, preferences, onChange })}
      </ListSection>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: spacing.lg,
  },
});
