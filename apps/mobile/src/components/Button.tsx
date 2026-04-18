import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { ViewStyle, TextStyle } from "react-native";
import {
  useTheme,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  touchTarget,
} from "../theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ghost: { backgroundColor: "transparent" },
  };

  const textVariantStyles: Record<ButtonVariant, TextStyle> = {
    primary: { color: colors.primaryForeground },
    secondary: { color: colors.foreground },
    outline: { color: colors.primary },
    ghost: { color: colors.primary },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        variantStyles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" ? colors.primaryForeground : colors.primary
          }
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            textVariantStyles[variant],
            styles[`text_size_${size}`],
            isDisabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
    minHeight: touchTarget.minSize,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },

  // Sizes
  size_sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: touchTarget.minSize,
  },
  size_lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },

  // Text
  text: {
    fontWeight: fontWeight.semibold,
  },
  textDisabled: {
    opacity: 0.7,
  },

  // Text sizes
  text_size_sm: {
    fontSize: fontSize.sm,
  },
  text_size_md: {
    fontSize: fontSize.md,
  },
  text_size_lg: {
    fontSize: fontSize.lg,
  },
});
