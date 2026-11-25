import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { BoardTheme } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { AnswerPair } from "../../../components";
import type { AnswerPairOption } from "../../../components";
import { useTheme } from "../../../theme";
import type { SquareColor } from "../lib/types";

type ColorButtonsProps = {
  /** Omitted → a picture of the buttons (the setup demo): nothing to press. */
  onAnswer?: (color: SquareColor) => void;
  disabled?: boolean;
  /** Paints the pair in the player's board theme, as the web does. */
  boardTheme: BoardTheme;
  /** The button just pressed and its verdict (`AnswerPair`'s ring). */
  selected?: { color: SquareColor; correct: boolean } | null;
  style?: StyleProp<ViewStyle>;
};

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
  const { colors } = useTheme();
  const palette = boardThemeColors[boardTheme];

  const option = (color: SquareColor): AnswerPairOption<SquareColor> => ({
    value: color,
    // squareColors.session.light, squareColors.session.dark
    label: t(`squareColors.session.${color}`),
    backgroundColor: palette[color],
    textColor: palette[`${color}Text`],
    borderColor: colors.border,
  });

  return (
    <AnswerPair
      options={[option("light"), option("dark")]}
      onAnswer={onAnswer}
      disabled={disabled}
      selected={
        selected && { value: selected.color, correct: selected.correct }
      }
      style={[styles.container, style]}
      buttonStyle={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  /**
   * The web's `max-w-xs`: on a phone the pair would otherwise fill the
   * width and push the square up against the clock row.
   */
  container: {
    maxWidth: 320,
  },
  button: {
    aspectRatio: 1,
  },
});
