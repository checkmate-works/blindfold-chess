import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { Side } from "@blindfold-chess/types";
import { getEloForSkillLevel } from "@blindfold-chess/features/ai-game";

import { ListRow, ListSection } from "../../../components";
import { fontSize, fontWeight, spacing, feedbackColors } from "../../../theme";
import type { PlayerResult, SkillLevel } from "../lib/types";

type ResultCardProps = {
  result: PlayerResult;
  playerColor: Side;
  skillLevel: SkillLevel;
  moveCount: number;
  /** Exp granted for the game, once the server has answered. */
  earnedExp?: number;
};

const RESULT_COLOR: Record<PlayerResult, string> = {
  win: feedbackColors.success,
  loss: feedbackColors.error,
  draw: feedbackColors.warning,
};

/**
 * How a finished AI game went: the outcome, then who it was played against.
 * Presentational only; the result screen owns what to do next.
 */
export function ResultCard({
  result,
  playerColor,
  skillLevel,
  moveCount,
  earnedExp,
}: ResultCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={[styles.resultText, { color: RESULT_COLOR[result] }]}>
        {/* aiGame.result.<PlayerResult>: aiGame.result.win, aiGame.result.loss, aiGame.result.draw */}
        {t(`aiGame.result.${result}`)}
      </Text>
      <ListSection>
        <ListRow
          title={t("aiGame.result.playerColor")}
          // aiGame.setup.<Side>: aiGame.setup.white, aiGame.setup.black
          value={t(`aiGame.setup.${playerColor}`)}
          accessory="none"
        />
        <ListRow
          title={t("aiGame.result.skillLevel")}
          value={t("aiGame.setup.levelWithElo", {
            level: skillLevel,
            elo: getEloForSkillLevel(skillLevel),
          })}
          accessory="none"
        />
        <ListRow
          title={t("aiGame.result.moveCount")}
          value={String(moveCount)}
          accessory="none"
        />
        {earnedExp !== undefined ? (
          <ListRow
            title={t("aiGame.result.expEarned")}
            value={`+${earnedExp}`}
            accessory="none"
          />
        ) : null}
      </ListSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  resultText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
});
