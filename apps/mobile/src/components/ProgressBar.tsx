import { StyleSheet, Text, View } from "react-native";

import { borderRadius, fontSize, spacing, useTheme } from "../theme";

type ProgressBarProps = {
  /** How far the run is: the question on screen, or the squares visited. */
  current: number;
  /** What `current` counts up to. */
  total: number;
};

/**
 * The web's `ProgressBar` over a free-play run (algebraic notation's
 * questions, the FEN and position-memory problems, knight tour's squares,
 * recall's moves): "3 / 20" in small muted text, `mb-2` over an 8pt
 * fully rounded track on the secondary surface, filled in the text colour.
 *
 * The digits are tabular so the label keeps its width as the count grows
 * and does not jitter from one question to the next. The fill is clamped to
 * the track, and an empty run (`total` 0) draws an empty track rather than
 * dividing by zero.
 */
export function ProgressBar({ current, total }: ProgressBarProps) {
  const { colors } = useTheme();
  const ratio = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {`${current} / ${total}`}
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
  // `text-sm` with `mb-2` under it.
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontVariant: ["tabular-nums"],
  },
  // `h-2 rounded-full`.
  track: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
});
