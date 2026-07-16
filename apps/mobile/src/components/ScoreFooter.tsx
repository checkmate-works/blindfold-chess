import { View, Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Check, X } from "lucide-react-native";

import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type ScoreFooterProps = {
  correctCount: number;
  incorrectCount: number;
  /** Overrides the footer container's spacing (e.g. a tighter paddingBottom). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Correct/incorrect running score row shown at the bottom of every practice
 * session screen.
 */
export function ScoreFooter({
  correctCount,
  incorrectCount,
  style,
}: ScoreFooterProps) {
  const { colors, feedbackColors } = useTheme();

  return (
    <View style={[styles.footer, style]}>
      <View style={styles.scoreItem}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: feedbackColors.successSoft },
          ]}
        >
          <Check size={16} color={feedbackColors.success} />
        </View>
        <Text style={[styles.scoreValue, { color: colors.foreground }]}>
          {correctCount}
        </Text>
      </View>

      <View style={styles.scoreItem}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: feedbackColors.errorSoft },
          ]}
        >
          <X size={16} color={feedbackColors.error} />
        </View>
        <Text style={[styles.scoreValue, { color: colors.foreground }]}>
          {incorrectCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  scoreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    padding: spacing.xs,
    borderRadius: 999,
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
