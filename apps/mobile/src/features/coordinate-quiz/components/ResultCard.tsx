import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { deriveResultStats } from "@blindfold-chess/features/common";
import { Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { QuizResult } from "../lib/types";

type ResultCardProps = {
  result: QuizResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  const { stats } = deriveResultStats(result, {
    correctAnswers: t("coordinateQuiz.result.correctAnswers"),
    accuracy: t("coordinateQuiz.result.accuracy"),
    timeTaken: t("coordinateQuiz.result.timeTaken"),
    averageTime: t("coordinateQuiz.result.averageTime"),
  });

  return (
    <Card padding="lg">
      <View style={styles.pointsContainer}>
        <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>
          {t("coordinateQuiz.result.points")}
        </Text>
        <Text style={[styles.pointsValue, { color: colors.primary }]}>
          {result.points}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsGrid}>
        {stats.map((item, index) => (
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
  pointsContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  pointsLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  pointsValue: {
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
