import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type SquarePairBadgeProps = {
  from: string;
  to: string;
  /** Extra layout for the row, e.g. spacing below it. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Two squares as display-size badges joined by an arrow — the "from → to"
 * prompt the legal-moves and route-planner cards both lead with.
 */
export function SquarePairBadge({ from, to, style }: SquarePairBadgeProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.square, { color: colors.foreground }]}>
          {from}
        </Text>
      </View>
      <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
        {"→"}
      </Text>
      <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.square, { color: colors.foreground }]}>{to}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  square: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  arrow: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
});
