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
  fontWeight,
  withAlpha,
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

/**
 * The paint of each variant at rest and while pressed. `ghost` has no
 * surface, so its pressed state cannot be shown by a fill; it dims its label
 * instead (see `GHOST_PRESSED_OPACITY`).
 */
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
        fill: "transparent",
        border: "transparent",
        label: colors.primary,
      };
  }
}

/** How far a pressed `ghost` label fades — the only press cue it has. */
const GHOST_PRESSED_OPACITY = 0.6;

/**
 * The app's button.
 *
 * @description
 * The look follows the app's flat rule: a pressed button changes only its
 * fill — it never moves and never fades as a whole — so this is a
 * `Pressable` with a style function rather than a touchable that dims
 * itself on press.
 *
 * - Corner `borderRadius.button` (14), label weight 700 (600 for `ghost`).
 * - Heights: sm 36 / md 44 / lg 48. The old lg was about 70pt tall and had
 *   become the heaviest element on every screen it appeared on, which is why
 *   `ModeButtonRow` had already been overriding it down to about 50pt.
 * - Every variant carries a 1px border (transparent on the filled and the
 *   bare variants) so all four are exactly the same height side by side.
 * - `primary` is the one blue surface: filled `primary`, darker
 *   `primaryPressed` while pressed. `outline` (blue label) and `secondary`
 *   (ink label) are white with the 1px `panelBorder` that every panel uses;
 *   `secondary` used to be a grey fill, which could not be told apart from
 *   the grey of a disabled button.
 * - Disabled is a grey fill (`muted`) with a `mutedForeground` label, never a
 *   translucent version of the live colours: a faded blue still reads as
 *   pressable on a white page. `ghost` only greys its label.
 * - `loading` disables the press but keeps the live paint and the label; the
 *   spinner takes the icon's slot so the width does not jump.
 *
 * The variant names are kept as they were (rather than renamed to match any
 * other app's vocabulary) because they are used at many call sites across
 * parallel work; only what they look like changed. `style` and `textStyle`
 * are applied last so a caller's override (e.g. `ModeButtonRow`'s taller
 * vertical padding) always wins.
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
      accessibilityState={{ disabled: isDisabled }}
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
          opacity:
            variant === "ghost" && pressed && !isDisabled
              ? GHOST_PRESSED_OPACITY
              : 1,
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
  },

  // Sizes
  size_sm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    minHeight: 44,
  },
  size_lg: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 48,
  },

  // Text
  text: {
    fontWeight: fontWeight.bold,
  },
  textGhost: {
    fontWeight: fontWeight.semibold,
  },

  // Text sizes
  text_size_sm: {
    fontSize: 14,
  },
  text_size_md: {
    fontSize: 15,
  },
  text_size_lg: {
    fontSize: 16,
  },
});
