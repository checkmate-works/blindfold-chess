import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getCorrectQuadrant } from "@blindfold-chess/features/quadrants";

import { useDemoAnswerLoop } from "../../../lib/use-demo-answer-loop";
import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import { QuadrantBoard } from "./QuadrantBoard";

const DEMO_SQUARE = "e4";

/** Small enough to sit under the prompt without pushing the settings off screen. */
const DEMO_BOARD_SIZE = 160;

/**
 * The setup screen's demo: the web's "e4" over "Which quadrant is e4 in?".
 * Like every module's demo it also plays the answer on a loop, and the
 * answer here is a tap on the board, so a small quartered board stands under
 * the prompt and its bottom-right quarter lights up green the way a correct
 * answer looks in a run. The web's demo has no board.
 */
export function HowToPlayDemo() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const answered = useDemoAnswerLoop();

  return (
    <View style={styles.container}>
      <Text style={[styles.square, { color: colors.foreground }]}>
        {DEMO_SQUARE}
      </Text>
      <Text style={[styles.question, { color: colors.mutedForeground }]}>
        {t("quadrants.session.question", { square: DEMO_SQUARE })}
      </Text>
      <View style={styles.board}>
        <QuadrantBoard
          orientation="white"
          correctQuadrant={answered ? getCorrectQuadrant(DEMO_SQUARE) : null}
          wrongQuadrant={null}
          maxSize={DEMO_BOARD_SIZE}
          showCoordinates={false}
        />
      </View>
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
  // The web's text-sm text-muted-foreground.
  question: {
    fontSize: fontSize.sm,
  },
  board: {
    marginTop: spacing.md,
  },
});
