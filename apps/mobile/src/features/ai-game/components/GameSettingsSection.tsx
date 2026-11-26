import { useTranslation } from "react-i18next";
import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  type DifficultyLevel,
  matchDifficultyPreset,
  type PerGamePreferences,
} from "@blindfold-chess/features/game-preferences";

import { ListSection, SelectRow } from "../../../components";
import { perGameSettingRows } from "../../settings/per-game-setting-rows";

type Props = {
  preferences: PerGamePreferences;
  onChange: (updates: Partial<PerGamePreferences>) => void;
};

/**
 * How blind this game is played: the web's difficulty ladder, then the
 * settings a rung is made of. Picking a rung writes its values into those
 * settings and they stay editable; the rung shown is always read back from
 * them, and a combination on no rung reads as "Custom".
 */
export function GameSettingsSection({ preferences, onChange }: Props) {
  const { t } = useTranslation();
  const level = matchDifficultyPreset(preferences);

  return (
    <ListSection
      title={t("common.gameSettings")}
      footer={
        level === null
          ? `${t("aiGame.setup.difficulty.custom")}: ${t("aiGame.setup.difficulty.customDescription")}`
          : undefined
      }
    >
      {/* aiGame.setup.difficulty.levels.level{1,2,3,4,5} */}
      <SelectRow<DifficultyLevel>
        label={t("aiGame.setup.difficulty.title")}
        options={DIFFICULTY_LEVELS}
        value={level}
        onChange={(picked) => onChange(DIFFICULTY_PRESETS[picked])}
        formatOption={(option) =>
          t("aiGame.setup.difficulty.option", {
            level: option,
            description: t(`aiGame.setup.difficulty.levels.level${option}`),
          })
        }
      />
      {perGameSettingRows({ t, preferences, onChange })}
    </ListSection>
  );
}
