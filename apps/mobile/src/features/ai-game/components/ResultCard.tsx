import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import type { Side } from "@blindfold-chess/types";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  feedbackColors,
} from "../../../theme";
import type { PlayerResult, SkillLevel } from "../lib/types";

type ResultCardProps = {
  result: PlayerResult;
  playerColor: Side;
  skillLevel: SkillLevel;
  moveCount: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
};

export function ResultCard({
  result,
  playerColor,
  skillLevel,
  moveCount,
  onPlayAgain,
  onBackToMenu,
}: ResultCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getResultText = () => {
    switch (result) {
      case "win":
        return t("aiGame.result.win");
      case "loss":
        return t("aiGame.result.loss");
      case "draw":
        return t("aiGame.result.draw");
    }
  };

  const getResultColor = () => {
    switch (result) {
      case "win":
        return feedbackColors.success;
      case "loss":
        return feedbackColors.error;
      case "draw":
        return feedbackColors.warning;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.resultText, { color: getResultColor() }]}>
        {getResultText()}
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {t("aiGame.result.playerColor")}
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {t(`aiGame.setup.${playerColor}`)}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {t("aiGame.result.skillLevel")}
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {skillLevel}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {t("aiGame.result.moveCount")}
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {moveCount}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={onPlayAgain}
        >
          <Text
            style={[styles.buttonText, { color: colors.primaryForeground }]}
          >
            {t("aiGame.result.playAgain")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={onBackToMenu}
        >
          <Text style={[styles.buttonText, { color: colors.foreground }]}>
            {t("aiGame.result.backToMenu")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    alignItems: "center",
  },
  resultText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  statsContainer: {
    width: "100%",
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.md,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  buttonContainer: {
    width: "100%",
    gap: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButton: {},
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
