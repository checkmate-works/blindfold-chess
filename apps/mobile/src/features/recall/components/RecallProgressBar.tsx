import { StyleSheet, Text, View } from "react-native";

import { borderRadius, fontSize, spacing, useTheme } from "../../../theme";

/**
 * The web's `ProgressBar`: "current / total" over an 8pt bar on the
 * secondary surface, filled in the foreground colour.
 */
export function RecallProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const { colors } = useTheme();
  const ratio = total > 0 ? Math.min(1, current / total) : 0;
  return (
    <View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {current} / {total}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: colors.foreground, width: `${ratio * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: borderRadius.full,
  },
});
