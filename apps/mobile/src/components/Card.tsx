import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme, spacing, borderRadius, shadows } from "../theme";

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
};

export function Card({
  children,
  style,
  padding = "md",
  shadow = "sm",
}: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.card, borderColor: colors.border },
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
