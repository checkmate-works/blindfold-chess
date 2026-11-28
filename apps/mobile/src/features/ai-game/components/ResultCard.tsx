import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { Side } from "@blindfold-chess/types";
import { getEloForSkillLevel } from "@blindfold-chess/features/ai-game";

import { ListRow, ListSection } from "../../../components";
import { spacing } from "../../../theme";
import type { GameTermination } from "../hooks/useGameSession";
import type { PlayerResult, SkillLevel } from "../lib/types";
import { ResultHeadline } from "./ResultHeadline";

type ResultCardProps = {
  result: PlayerResult;
  termination: GameTermination;
  playerColor: Side;
  skillLevel: SkillLevel;
  moveCount: number;
  /** Exp granted for the game, once the server has answered. */
  earnedExp?: number;
};

/**
 * How a finished AI game went: the outcome and how it came about, then who
 * it was played against. Presentational only; the finish sheet owns what to
 * do next.
 */
export function ResultCard({
  result,
  termination,
  playerColor,
  skillLevel,
  moveCount,
  earnedExp,
}: ResultCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ResultHeadline result={result} termination={termination} />
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
});
