import { StyleSheet, View } from "react-native";
import type { BoardTheme } from "@blindfold-chess/types";

import type { SquareColor } from "../lib/types";
import { spacing } from "../../../theme";
import { ColorButtons } from "./ColorButtons";
import { SquareQuestion } from "./SquareQuestion";

type QuestionPanelProps = {
  square: string | null;
  /** The verdict on the last answer while it is shown, else null. */
  verdict: boolean | null;
  /** The button pressed for the answer being shown. */
  answeredColor: SquareColor | null;
  onAnswer: (color: SquareColor) => void;
  disabled: boolean;
  boardTheme: BoardTheme;
  /** The challenge's countdown, shown where the square will appear. */
  countdown?: number | null;
};

/**
 * The square and its light / dark pair, spaced as the web's
 * `SquareColorsQuestionPanel`: the square, 48 below it the buttons. The
 * challenge and training both stack it from the top like the web, so the
 * eye moves only a short way from the square to the answer.
 */
export function QuestionPanel({
  square,
  verdict,
  answeredColor,
  onAnswer,
  disabled,
  boardTheme,
  countdown = null,
}: QuestionPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.square}>
        <SquareQuestion
          square={square}
          isCorrect={verdict}
          countdown={countdown}
        />
      </View>
      <ColorButtons
        onAnswer={onAnswer}
        disabled={disabled}
        boardTheme={boardTheme}
        selected={
          verdict !== null && answeredColor
            ? { color: answeredColor, correct: verdict }
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: spacing.lg,
  },
  // The web's mb-4 under the square plus mb-8 under its block.
  square: {
    marginBottom: 48,
  },
});
