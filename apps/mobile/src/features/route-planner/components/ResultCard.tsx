import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { RoutePlannerResult } from "../hooks";

type ResultCardProps = {
  result: RoutePlannerResult;
};

export function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  return (
    <Card padding="lg">
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
          {t("routePlanner.result.score")}
        </Text>
        <Text style={[styles.scoreValue, { color: colors.primary }]}>
          {result.correctCount} / {result.totalProblems}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {t("routePlanner.result.correct")}
          </Text>
          <Text style={[styles.statValue, { color: feedbackColors.success }]}>
            {result.correctCount}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {t("routePlanner.result.accuracy")}
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {result.accuracy.toFixed(1)}%
          </Text>
        </View>
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
