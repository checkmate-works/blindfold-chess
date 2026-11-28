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
   * The web's accuracy graph: right answers out of the questions asked, with
   * `summary` ("2 / 4 · 50.0%") beside its caption. When given, it stands in
   * for the big headline, which would only say the same count again.
   */
  accuracy?: { correct: number; total: number; summary: string };
};

/**
 * The score panel at the top of a practice result.
 *
 * With an accuracy count the panel opens on the web's graph rather than a
 * 48pt "2 / 4": the web's result has no such number either, and the bar
 * already shows the count, so the headline only took a third of the screen
 * to repeat it. The count stays in words beside the graph's caption. A
 * result with no right-or-wrong count keeps the headline.
 */

export function PracticeResultCard({
  scoreLabel,
  scoreValue,
  statItems,
  accuracy,
}: PracticeResultCardProps) {
  const { colors, feedbackColors } = useTheme();

  return (
    <Card padding="lg">
      {accuracy && accuracy.total > 0 ? (
        <AccuracyBar
          correct={accuracy.correct}
          total={accuracy.total}
          summary={accuracy.summary}
        />
      ) : (
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
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  // Centred: a grid of one (quadrants' time) or three (coordinate quiz's
  // points and times) would otherwise hang to the left.
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
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
