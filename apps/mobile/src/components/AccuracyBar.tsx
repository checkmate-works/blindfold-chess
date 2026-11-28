import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useResultMistakes } from "./result-mistakes";
import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../theme";

type AccuracyBarProps = {
  correct: number;
  total: number;
};

/**
 * The web result's accuracy graph: one bar split into the right answers
 * (green) and the rest (red), each part carrying its count, with a legend
 * under it. A part with nothing in it is left out of the bar but stays in
 * the legend, so "Incorrect: 0" is still said.
 *
 * The legend's incorrect count opens the missed problems when the screen has
 * a problem list that registered them (`useResultMistakes`); otherwise it is
 * plain text.
 */
export function AccuracyBar({ correct, total }: AccuracyBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mistakes = useResultMistakes();
  const incorrect = Math.max(total - correct, 0);
  const segments = [
    { key: "correct", value: correct, color: colors.success },
    { key: "incorrect", value: incorrect, color: colors.destructive },
  ].filter((segment) => segment.value > 0);

  const incorrectLabel = `${t("practiceResult.incorrect")}: ${incorrect}`;
  const reveal = incorrect > 0 ? mistakes?.reveal : undefined;

  return (
    <View>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {t("practiceResult.accuracy")}
      </Text>
      <View
        style={[styles.track, { backgroundColor: colors.muted }]}
        accessibilityRole="progressbar"
        accessibilityLabel={t("practiceResult.accuracy")}
        accessibilityValue={{ min: 0, max: total, now: correct }}
      >
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.segment,
              {
                backgroundColor: segment.color,
                width: `${total > 0 ? (segment.value / total) * 100 : 0}%`,
              },
            ]}
          >
            <Text
              style={[styles.count, { color: colors.primaryForeground }]}
              numberOfLines={1}
            >
              {segment.value}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <LegendItem
          color={colors.success}
          label={`${t("practiceResult.correct")}: ${correct}`}
        />
        <LegendItem
          color={colors.destructive}
          label={incorrectLabel}
          onPress={reveal}
        />
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
  onPress,
}: {
  color: string;
  label: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const swatch = <View style={[styles.swatch, { backgroundColor: color }]} />;

  if (!onPress) {
    return (
      <View style={styles.legendItem}>
        {swatch}
        <Text style={[styles.legendText, { color: colors.foreground }]}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={styles.legendItem}
      testID="result-reveal-mistakes"
    >
      {({ pressed }) => (
        <>
          {swatch}
          <Text
            style={[
              styles.legendText,
              styles.legendLink,
              { color: pressed ? colors.primaryPressed : colors.primary },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** The web's `h-8 rounded-lg` bar, its `text-sm` counts and `text-xs` legend. */
const styles = StyleSheet.create({
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  track: {
    flexDirection: "row",
    height: 32,
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.sm,
  },
  legendText: {
    fontSize: fontSize.sm,
    fontVariant: ["tabular-nums"],
  },
  legendLink: {
    // A text action in the app's blue, not the web's underline.
    fontWeight: fontWeight.semibold,
  },
});
