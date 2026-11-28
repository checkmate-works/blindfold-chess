import { StyleSheet, Text, View } from "react-native";
import {
  type DeltaTone,
  formatSignedDelta,
  signedDeltaTone,
} from "@blindfold-chess/features/challenge-records";

import {
  type AppColors,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../theme";

type Stat = {
  label: string;
  value: number | null;
  /** Decimals to show; the comparison is rounded the same way. */
  fractionDigits: number;
  /** Change from the previous period; null when there is nothing to compare. */
  change: number | null;
};

type Props = {
  best: Omit<Stat, "label" | "fractionDigits">;
  average: Omit<Stat, "label" | "fractionDigits">;
  bestLabel: string;
  averageLabel: string;
  /** "vs last week" and the like, after the signed change. */
  comparisonLabel: string;
};

function toneColor(tone: DeltaTone, colors: AppColors): string {
  if (tone === "up") return colors.success;
  if (tone === "down") return colors.destructive;
  return colors.mutedForeground;
}

/**
 * Best score and average score side by side, each with its signed change
 * from the previous period — the web's two `StatsCard`s, as two panels.
 */
export function RecordStats({
  best,
  average,
  bestLabel,
  averageLabel,
  comparisonLabel,
}: Props) {
  const stats: Stat[] = [
    { label: bestLabel, fractionDigits: 0, ...best },
    { label: averageLabel, fractionDigits: 1, ...average },
  ];
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <StatPanel
          key={stat.label}
          stat={stat}
          comparisonLabel={comparisonLabel}
        />
      ))}
    </View>
  );
}

function StatPanel({
  stat,
  comparisonLabel,
}: {
  stat: Stat;
  comparisonLabel: string;
}) {
  const { colors } = useTheme();
  const value =
    stat.value === null ? "-" : stat.value.toFixed(stat.fractionDigits);
  const tone =
    stat.change === null
      ? null
      : signedDeltaTone(stat.change, stat.fractionDigits);
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.card, borderColor: colors.panelBorder },
      ]}
      accessible
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {stat.label}
      </Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      {stat.change !== null && tone !== null ? (
        <Text style={[styles.change, { color: toneColor(tone, colors) }]}>
          {formatSignedDelta(stat.change, stat.fractionDigits)}{" "}
          {comparisonLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: 2,
  },
  label: {
    fontSize: fontSize.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  change: {
    fontSize: fontSize.xs,
    fontVariant: ["tabular-nums"],
  },
});
