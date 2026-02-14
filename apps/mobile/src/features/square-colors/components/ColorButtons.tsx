import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
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
};

export function ColorButtons({ onAnswer, disabled }: ColorButtonsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onAnswer("light")}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.button,
          {
            backgroundColor: chessColors.boardLight,
            borderColor: colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: "#3d3d3d" }]}>
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
            backgroundColor: chessColors.boardDark,
            borderColor: colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: "#ffffff" }]}>
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
