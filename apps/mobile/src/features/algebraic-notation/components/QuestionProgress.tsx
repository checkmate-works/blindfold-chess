import { View, Text, StyleSheet } from "react-native";

import { useTheme, fontSize, spacing } from "../../../theme";

type QuestionProgressProps = {
  /** The question on screen, counted from 1. */
  current: number;
  total: number;
};

/**
 * The web's `ProgressBar` over a free-play run: "3 / 20" in small muted
 * text, then an 8pt rounded track (`bg-secondary`) filled in the text
 * colour up to the current question.
 */
export function QuestionProgress({ current, total }: QuestionProgressProps) {
  const { colors } = useTheme();
  const ratio = total > 0 ? Math.min(current / total, 1) : 0;

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
  },
  // `h-2 rounded-full`.
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
});
