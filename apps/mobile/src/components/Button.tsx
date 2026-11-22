import Ionicons from "@expo/vector-icons/Ionicons";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
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
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  /** A glyph before the title, drawn in the title's colour. */
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

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
  icon,
  testID,
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
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
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
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon}
              size={ICON_SIZE[size]}
              style={[
                textVariantStyles[variant],
                isDisabled && styles.textDisabled,
              ]}
            />
          )}
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
        </View>
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
