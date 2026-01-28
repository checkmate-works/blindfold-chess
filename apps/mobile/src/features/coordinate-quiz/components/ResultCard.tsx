import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components";
import { colors, fontSize, fontWeight, spacing } from "../../../theme";
import type { QuizResult } from "../lib/types";

type ResultCardProps = {
  result: QuizResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t("coordinateQuiz.result.totalQuestions"),
      value: result.totalQuestions.toString(),
    },
    {
      label: t("coordinateQuiz.result.correctAnswers"),
      value: result.correctAnswers.toString(),
      highlight: true,
    },
    {
      label: t("coordinateQuiz.result.accuracy"),
      value: `${result.accuracy.toFixed(1)}%`,
    },
    {
      label: t("coordinateQuiz.result.averageTime"),
      value: `${result.averageTime.toFixed(1)}s`,
    },
  ];

  return (
    <Card padding="lg">
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsLabel}>
          {t("coordinateQuiz.result.points")}
        </Text>
        <Text style={styles.pointsValue}>{result.points}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text
              style={[
                styles.statValue,
                item.highlight && styles.statValueHighlight,
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
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
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
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statValueHighlight: {
    color: colors.success,
  },
});
