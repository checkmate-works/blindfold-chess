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

  if (countdown !== null) {
    return (
      <SquarePrompt
        square={countdown > 0 ? String(countdown) : "START!"}
        squareColor={colors.primary}
      />
    );
  }
  if (!square) return null;

  return (
    <SquarePrompt
      square={square}
      squareColor={isCorrect === null ? undefined : verdictColor}
    />
  );
}
