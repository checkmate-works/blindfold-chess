import { useTranslation } from "react-i18next";
import { SIDES, type Side } from "@blindfold-chess/types";
import { getEloForSkillLevel } from "@blindfold-chess/features/ai-game";

import { ListSection, SelectRow } from "../../../components";
import type { SkillLevel } from "../lib/types";

type SettingsFormProps = {
  playerColor: Side;
  skillLevel: SkillLevel;
  /** A note under the section, e.g. that the colour was picked from a PGN. */
  playerColorHint?: string;
  onUpdatePlayerColor: (color: Side) => void;
  onUpdateSkillLevel: (level: SkillLevel) => void;
};

const SKILL_LEVELS: readonly SkillLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

/**
 * Who the player faces: their colour and the engine's strength. A level is
 * shown with the rating it is limited to ("Level 5 (1200 ELO)"), as on the
 * web, since the number alone says little about how strong it plays.
 */
export function SettingsForm({
  playerColor,
  skillLevel,
  playerColorHint,
  onUpdatePlayerColor,
  onUpdateSkillLevel,
}: SettingsFormProps) {
  const { t } = useTranslation();

  return (
    <ListSection title={t("aiGame.setup.opponent")} footer={playerColorHint}>
      {/* aiGame.setup.<Side>: aiGame.setup.white, aiGame.setup.black */}
      <SelectRow<Side>
        label={t("aiGame.setup.playerColor")}
        options={SIDES}
        value={playerColor}
        onChange={onUpdatePlayerColor}
        formatOption={(side) => t(`aiGame.setup.${side}`)}
      />
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
  );
}
