import { StyleSheet, Text, View } from "react-native";

import { useGamePreferences } from "../../../lib/game-preferences";
import { useDemoAnswerLoop } from "../../../lib/use-demo-answer-loop";
import { fontWeight, useTheme } from "../../../theme";
import type { SquareColor } from "../lib/types";
import { ColorButtons } from "./ColorButtons";

const DEMO_SQUARE = "e4";
const DEMO_ANSWER: SquareColor = "light";

/** The web demo's `max-w-[200px]`. */
const BUTTONS_WIDTH = 200;

/**
 * The setup screen's demo: "e4" over the light / dark pair in the player's
 * board theme, as the web's how-to-play demo shows. Like the coordinate
 * quiz's demo it also plays the answer on a loop: the right button takes
 * the session's green ring and the square turns green, the way a correct
 * answer looks in the session.
 */
export function HowToPlayDemo() {
  const { colors, feedbackColors } = useTheme();
  const { preferences } = useGamePreferences();
  const answered = useDemoAnswerLoop();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.square,
          { color: answered ? feedbackColors.success : colors.foreground },
        ]}
      >
        {DEMO_SQUARE}
      </Text>
      <ColorButtons
        boardTheme={preferences.boardTheme}
        selected={answered ? { color: DEMO_ANSWER, correct: true } : null}
        style={styles.buttons}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  // The web's text-4xl font-bold mb-3.
  square: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    marginBottom: 12,
  },
  buttons: {
    width: BUTTONS_WIDTH,
  },
});
