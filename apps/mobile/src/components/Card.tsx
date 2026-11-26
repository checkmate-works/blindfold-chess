import { View, StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";
import { useTheme, spacing, borderRadius, shadows } from "../theme";

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
};

/**
 * A panel laid on the page: white, a 1px `panelBorder` and a 12pt corner.
 *
 * @description
 * No shadow by default. The app's look is flat — a panel resting on the
 * page is outlined, not lifted — so a shadow belongs only on a layer that
 * really floats above the page (a sheet, an overlay). `shadow` is still
 * accepted and the theme's `shadows` are kept, because removing the prop
 * would break the type of every caller that passes it, and those layers
 * still need it.
 */
export function Card({
  children,
  style,
  padding = "md",
  shadow = "none",
}: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.card, borderColor: colors.panelBorder },
        padding !== "none" && styles[`padding_${padding}`],
        shadow !== "none" && shadows[shadow],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  padding_sm: {
    padding: spacing.sm,
  },
  padding_md: {
    padding: spacing.md,
  },
  padding_lg: {
    padding: spacing.lg,
  },
});
