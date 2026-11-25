import { memo } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { boardThemeColors } from "@blindfold-chess/ui";
import type { BoardTheme } from "@blindfold-chess/types";
import { computeSquareColor } from "@blindfold-chess/features/coordinate-quiz";

import { useTheme, touchTarget } from "../../../theme";
import type { Square } from "../lib/types";

/**
 * What a square shows after an answer: the square the player pressed
 * (`correct` / `incorrect`) and the question's square (`target`).
 */
export type SquareHighlight = "correct" | "incorrect" | "target";

/**
 * The web's `CoordinateQuizBoard` colours: `bg-success` / `bg-destructive`
 * for the pressed square, and Tailwind's `green-500` (`green-700` in dark
 * mode) with an inset `green-600/50` (`green-800/50`) ring for the target.
 * The target greens have no theme token on either platform.
 */
const TARGET_COLORS = {
  light: { fill: "#22c55e", ring: "rgba(22, 163, 74, 0.5)" },
  dark: { fill: "#15803d", ring: "rgba(22, 101, 52, 0.5)" },
} as const;

type ChessBoardSquareProps = {
  square: Square;
  onPress: (square: Square) => void;
  highlight: SquareHighlight | undefined;
  boardTheme: BoardTheme;
  disabled: boolean;
  size: number;
};

export const ChessBoardSquare = memo(function ChessBoardSquare({
  square,
  onPress,
  highlight,
  boardTheme,
  disabled,
  size,
}: ChessBoardSquareProps) {
  const { colors, isDark } = useTheme();
  const theme = boardThemeColors[boardTheme];
  const target = TARGET_COLORS[isDark ? "dark" : "light"];

  const backgroundColor =
    highlight === "correct"
      ? colors.success
      : highlight === "incorrect"
        ? colors.destructive
        : highlight === "target"
          ? target.fill
          : computeSquareColor(square) === "light"
            ? theme.light
            : theme.dark;

  return (
    <TouchableOpacity
      onPress={() => onPress(square)}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={square}
      style={[
        styles.square,
        { width: size, height: size, backgroundColor },
        highlight === "target" && {
          borderWidth: 2,
          borderColor: target.ring,
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  square: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
  },
});
