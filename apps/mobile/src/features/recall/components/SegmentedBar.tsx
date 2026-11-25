import { StyleSheet, Text, View } from "react-native";

import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";

export type SegmentedBarSegment = {
  key: string;
  value: number;
  color: string;
  label: string;
};

/**
 * The web's `SegmentedProgressBar`: a 32pt bar split by value, each part
 * carrying its count in white, and a legend under it with a swatch and
 * "label: count" for every segment (an empty one too, so the legend keeps
 * its three places).
 */
export function SegmentedBar({
  segments,
  total,
}: {
  segments: readonly SegmentedBarSegment[];
  total: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.bar, { backgroundColor: colors.muted }]}>
        {segments
          .filter((s) => s.value > 0)
          .map((segment) => (
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
              <Text style={styles.count}>{segment.value}</Text>
            </View>
          ))}
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: segment.color }]} />
            <Text style={[styles.legendText, { color: colors.foreground }]}>
              {segment.label}: {segment.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
  },
  bar: {
    height: 32,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    color: "#ffffff",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
});
