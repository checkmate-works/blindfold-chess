import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Side } from "@blindfold-chess/types";
import { getEloForSkillLevel } from "@blindfold-chess/features/ai-game";

import { ListSection, SectionTitle, SelectRow } from "../../../components";
import { spacing } from "../../../theme";
import type { SkillLevel } from "../lib/types";
import { ColorSwitch } from "./ColorSwitch";

type SettingsFormProps = {
  playerColor: Side;
  skillLevel: SkillLevel;
  onUpdatePlayerColor: (color: Side) => void;
  onUpdateSkillLevel: (level: SkillLevel) => void;
};

const SKILL_LEVELS: readonly SkillLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

/**
 * The player's colour and the engine's strength. A level is shown with the
 * rating it is limited to ("Level 5 (1200 ELO)"), as on the web, since the
 * number alone says little about how strong it plays.
 */
export function SettingsForm({
  playerColor,
  skillLevel,
  onUpdatePlayerColor,
  onUpdateSkillLevel,
}: SettingsFormProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.sections}>
      <View>
        <SectionTitle style={styles.title}>
          {t("aiGame.setup.playerColor")}
        </SectionTitle>
        <ColorSwitch value={playerColor} onChange={onUpdatePlayerColor} />
      </View>
      <ListSection title={t("aiGame.setup.opponent")}>
        <SelectRow<SkillLevel>
          label={t("aiGame.setup.skillLevel")}
          options={SKILL_LEVELS}
          value={skillLevel}
          onChange={onUpdateSkillLevel}
          formatOption={(level) =>
            t("aiGame.setup.levelWithElo", {
              level,
              elo: getEloForSkillLevel(level),
            })
          }
        />
      </ListSection>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: spacing.lg,
  },
  title: {
    marginBottom: 12,
  },
});
