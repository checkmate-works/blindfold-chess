import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import type { BoardTheme } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";
import {
  chessColors,
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import type { SquareColor } from "../lib/types";

type ColorButtonsProps = {
  onAnswer: (color: SquareColor) => void;
  disabled: boolean;
  /**
   * Paints the two buttons in the player's board theme (the settings tab's
   * board preference), as the web training screen does. Without it they keep
   * the fixed board colours.
   */
  boardTheme?: BoardTheme;
};

const FIXED_COLORS = {
  light: chessColors.boardLight,
  dark: chessColors.boardDark,
  lightText: "#3d3d3d",
  darkText: "#ffffff",
};

export function ColorButtons({
  onAnswer,
  disabled,
  boardTheme,
}: ColorButtonsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const palette = boardTheme ? boardThemeColors[boardTheme] : FIXED_COLORS;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onAnswer("light")}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.button,
          {
            backgroundColor: palette.light,
            borderColor: colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: palette.lightText }]}>
          {t("squareColors.session.light")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onAnswer("dark")}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.button,
          {
            backgroundColor: palette.dark,
            borderColor: colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: palette.darkText }]}>
          {t("squareColors.session.dark")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
});
