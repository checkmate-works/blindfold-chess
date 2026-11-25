import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { BoardTheme } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import type { SquareColor } from "../lib/types";

type ColorButtonsProps = {
  /** Omitted → a picture of the buttons (the setup demo): nothing to press. */
  onAnswer?: (color: SquareColor) => void;
  disabled?: boolean;
  /** Paints the pair in the player's board theme, as the web does. */
  boardTheme: BoardTheme;
  /**
   * The button just pressed and its verdict: it keeps a green or red ring
   * and full strength while the others dim, the way the coordinate quiz's
   * pressed square keeps its colour until the next question.
   */
  selected?: { color: SquareColor; correct: boolean } | null;
  style?: StyleProp<ViewStyle>;
};

const COLORS: readonly SquareColor[] = ["light", "dark"];

/**
 * The light / dark answer pair: two squares in the board theme's colours
 * with the colour written on each (the web's `SquareColorAnswerButtons`).
 */
export function ColorButtons({
  onAnswer,
  disabled = false,
  boardTheme,
  selected = null,
  style,
}: ColorButtonsProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const palette = boardThemeColors[boardTheme];

  return (
    <View style={[styles.container, style]}>
      {COLORS.map((color) => {
        const isSelected = selected?.color === color;
        const ring = isSelected
          ? selected.correct
            ? feedbackColors.success
            : feedbackColors.error
          : colors.border;
        return (
          <Pressable
            key={color}
            onPress={onAnswer ? () => onAnswer(color) : undefined}
            disabled={disabled || !onAnswer}
            accessibilityRole={onAnswer ? "button" : undefined}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: palette[color],
                borderColor: ring,
                borderWidth: isSelected ? 3 : 1,
                opacity: disabled && !isSelected ? 0.5 : 1,
              },
              pressed && styles.pressed,
            ]}
          >
            {/* squareColors.session.light, squareColors.session.dark */}
            <Text
              style={[styles.buttonText, { color: palette[`${color}Text`] }]}
            >
              {t(`squareColors.session.${color}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The web's `max-w-xs`: on a phone the pair would otherwise fill the
   * width and push the square up against the clock row.
   */
  container: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  button: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    // The web's `rounded-md`.
    borderRadius: 6,
  },
  /** The web's `active:scale-95`. */
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  // The web's `text-lg font-bold`.
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
