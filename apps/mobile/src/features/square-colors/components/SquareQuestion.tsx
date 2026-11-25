import { View } from "react-native";

import { SquarePrompt } from "../../../components";
import { useFeedbackColor, useTheme } from "../../../theme";

type SquareQuestionProps = {
  square: string | null;
  /** The verdict on the last answer while it is shown, else null. */
  isCorrect: boolean | null;
  /**
   * Seconds left before the challenge starts: the count stands where the
   * square will appear, so the rows and the buttons stay in place around it.
   */
  countdown?: number | null;
};

/** The web's `text-6xl`: 60px, line height 1. */
const SQUARE_SIZE = 60;

/**
 * The square being asked about, as the web shows it: the name alone at
 * display size, turning green or red with the verdict. The setup screen has
 * already said what is asked, so there is no question line or verdict word.
 */
export function SquareQuestion({
  square,
  isCorrect,
  countdown = null,
}: SquareQuestionProps) {
  const { colors } = useTheme();
  const verdictColor = useFeedbackColor(isCorrect);

  // The slot keeps the square's height while there is nothing to show (the
  // wait for the first square from the server), so the buttons never move.
  return (
    <View style={{ height: SQUARE_SIZE }}>
      {countdown !== null ? (
        <SquarePrompt
          square={countdown > 0 ? String(countdown) : "START!"}
          squareColor={colors.primary}
          squareSize={SQUARE_SIZE}
        />
      ) : square ? (
        <SquarePrompt
          square={square}
          squareColor={isCorrect === null ? undefined : verdictColor}
          squareSize={SQUARE_SIZE}
        />
      ) : null}
    </View>
  );
}
