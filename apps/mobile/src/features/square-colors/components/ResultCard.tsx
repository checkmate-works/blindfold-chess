import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { SquareColorsResult } from "../hooks";

type ResultCardProps = {
  result: SquareColorsResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  const statItems = [
    {
      label: t("squareColors.result.correctAnswers"),
      value: result.correctAnswers.toString(),
      highlight: true,
    },
    {
      label: t("squareColors.result.accuracy"),
      value: `${result.accuracy.toFixed(1)}%`,
    },
    {
      label: t("squareColors.result.timeTaken"),
      value: `${result.timeTaken}s`,
    },
    {
      label: t("squareColors.result.averageTime"),
      value: `${result.averageTime.toFixed(1)}s`,
    },
  ];

  return (
    <Card padding="lg">
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
          {t("squareColors.result.correctAnswers")}
        </Text>
        <Text style={[styles.scoreValue, { color: colors.primary }]}>
          {result.correctAnswers} / {result.totalQuestions}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {item.label}
            </Text>
            <Text
              style={[
                styles.statValue,
                { color: colors.foreground },
                item.highlight && { color: feedbackColors.success },
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  statItem: {
    width: "45%",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
});
