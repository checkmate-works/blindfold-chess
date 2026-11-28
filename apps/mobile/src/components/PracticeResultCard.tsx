import { View, Text, StyleSheet } from "react-native";
import type { StatItem } from "@blindfold-chess/features/common";
import { AccuracyBar } from "./AccuracyBar";
import { Card } from "./Card";
import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type PracticeResultCardProps = {
  scoreLabel: string;
  scoreValue: string;
  statItems: StatItem[];
  /**
   * The web's accuracy graph under the headline: right answers out of the
   * questions asked. Left out for a result with no right-or-wrong count.
   */
  accuracy?: { correct: number; total: number };
};

export function PracticeResultCard({
  scoreLabel,
  scoreValue,
  statItems,
  accuracy,
}: PracticeResultCardProps) {
  const { colors, feedbackColors } = useTheme();

  return (
    <Card padding="lg">
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
          {scoreLabel}
        </Text>
        {/* Ink, not blue: the accent colour is kept for what can be pressed
            (the primary button, text actions), so the score does not
            compete with the button that starts the next round. */}
        <Text style={[styles.scoreValue, { color: colors.foreground }]}>
          {scoreValue}
        </Text>
      </View>

      {accuracy && accuracy.total > 0 && (
        <View style={styles.accuracy}>
          <AccuracyBar correct={accuracy.correct} total={accuracy.total} />
        </View>
      )}

      <View
        style={[styles.divider, { backgroundColor: colors.rowSeparator }]}
      />

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
  accuracy: {
    marginTop: spacing.sm,
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
