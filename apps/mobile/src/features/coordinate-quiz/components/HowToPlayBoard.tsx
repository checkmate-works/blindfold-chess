import { StyleSheet, Text, View } from "react-native";
import { boardThemeColors } from "@blindfold-chess/ui";
import {
  computeSquareColor,
  coordinatesToSquare,
} from "@blindfold-chess/features/coordinate-quiz";

import { useGamePreferences } from "../../../lib/game-preferences";
import { useDemoAnswerLoop } from "../../../lib/use-demo-answer-loop";
import { useTheme } from "../../../theme";

/** The web demo's `max-w-[240px]`. */
const BOARD_SIZE = 240;
const SQUARE_SIZE = BOARD_SIZE / 8;
const DEMO_SQUARE = "e4";

/**
 * The setup screen's demo: a white-side board in the player's theme with
 * "e4" written over it, as the web's how-to-play demo shows. On a phone it
 * also plays the answer: after a beat the e4 square lights in the session's
 * target green and goes dark again, on a loop, so the demo shows the tap
 * the description asks for instead of leaving it to the words.
 */
export function HowToPlayBoard() {
  const { isDark } = useTheme();
  const { preferences } = useGamePreferences();
  const theme = boardThemeColors[preferences.boardTheme];
  const answered = useDemoAnswerLoop();

  // ChessBoardSquare's target green (Tailwind green-500 / green-700).
  const answerColor = isDark ? "#15803d" : "#22c55e";

  return (
    <View
      style={styles.board}
      accessible
      accessibilityLabel={DEMO_SQUARE}
      accessibilityRole="image"
    >
      {Array.from({ length: 8 }, (_, rank) => (
        <View key={rank} style={styles.row}>
          {Array.from({ length: 8 }, (_, file) => {
            const square = coordinatesToSquare(file, rank, "white");
            const backgroundColor =
              answered && square === DEMO_SQUARE
                ? answerColor
                : computeSquareColor(square) === "light"
                  ? theme.light
                  : theme.dark;
            return (
              <View key={square} style={[styles.square, { backgroundColor }]} />
            );
          })}
        </View>
      ))}
      <View style={styles.labelLayer} pointerEvents="none">
        <Text style={styles.label}>{DEMO_SQUARE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
  row: {
    flexDirection: "row",
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
  },
  labelLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  // The web's text-4xl font-black white with a soft drop shadow.
  label: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
