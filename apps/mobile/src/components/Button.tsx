import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
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
  withAlpha,
  controlSize,
  controlLabel,
  touchTarget,
} from "../theme";
import type { AppColors } from "../theme";

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

/** The fill, border, and label colours of one variant in one state. */
type VariantPaint = {
  fill: string;
  border: string;
  label: string;
};

/** The paint of each variant at rest and while pressed. */
function variantPaint(
  colors: AppColors,
  variant: ButtonVariant,
  pressed: boolean,
): VariantPaint {
  switch (variant) {
    case "primary":
      return {
        fill: pressed ? colors.primaryPressed : colors.primary,
        border: "transparent",
        label: colors.primaryForeground,
      };
    case "outline":
      return {
        fill: pressed ? withAlpha(colors.primary, 0.08) : colors.card,
        border: colors.panelBorder,
        label: colors.primary,
      };
    case "secondary":
      return {
        fill: pressed ? colors.muted : colors.card,
        border: colors.panelBorder,
        label: colors.foreground,
      };
    case "ghost":
      return {
        fill: pressed ? colors.muted : "transparent",
        border: "transparent",
        label: colors.primary,
      };
  }
}

/**
 * Shared action button: compact 44pt, regular 48pt, footer 52pt minimum.
 * Every size uses the same label metrics and grows for wrapped/scaled text.
 * Press feedback changes fill only; loading keeps the label and live paint.
 */
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
  // Greyed out only when the caller disabled it; a loading button keeps its
  // live paint so it does not flash grey while the work runs.
  const showDisabled = disabled && !loading;

  const paintFor = (pressed: boolean): VariantPaint => {
    const live = variantPaint(colors, variant, pressed);
    if (!showDisabled) return live;
    if (variant === "ghost") return { ...live, label: colors.mutedForeground };
    return {
      fill: colors.muted,
      border: colors.muted,
      label: colors.mutedForeground,
    };
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => {
        const paint = paintFor(pressed);
        return [
          styles.base,
          styles[`size_${size}`],
          { backgroundColor: paint.fill, borderColor: paint.border },
          fullWidth && styles.fullWidth,
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const paint = paintFor(pressed);
        const labelStyle: TextStyle = {
          color: paint.label,
        };
        return (
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator color={paint.label} size="small" />
            ) : (
              icon && (
                <Ionicons
                  name={icon}
                  size={ICON_SIZE[size]}
                  style={labelStyle}
                />
              )
            )}
            <Text
              style={[
                variant === "ghost" ? styles.textGhost : styles.text,
                styles[`text_size_${size}`],
                labelStyle,
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: touchTarget.actionSize,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.button,
    borderWidth: 1,
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },

  size_sm: controlSize.sm,
  size_md: controlSize.md,
  size_lg: controlSize.lg,

  // Text
  text: {
    ...controlLabel,
    flexShrink: 1,
    textAlign: "center",
  },
  textGhost: {
    ...controlLabel,
    flexShrink: 1,
    textAlign: "center",
  },

  // Text sizes
  text_size_sm: {
    fontSize: controlLabel.fontSize,
  },
  text_size_md: {
    fontSize: controlLabel.fontSize,
  },
  text_size_lg: {
    fontSize: controlLabel.fontSize,
  },
});
