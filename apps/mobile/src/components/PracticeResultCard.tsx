import { View, Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type StatItem = {
  label: string;
  value: string;
  highlight?: boolean;
};

type PracticeResultCardProps = {
  scoreLabel: string;
  scoreValue: string;
  statItems: StatItem[];
};

export function PracticeResultCard({
  scoreLabel,
  scoreValue,
  statItems,
}: PracticeResultCardProps) {
  const { colors, feedbackColors } = useTheme();

  return (
    <Card padding="lg">
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
          {scoreLabel}
        </Text>
        <Text style={[styles.scoreValue, { color: colors.primary }]}>
          {scoreValue}
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
