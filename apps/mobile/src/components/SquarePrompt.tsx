import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, fontSize, fontWeight, spacing } from "../theme";

type SquarePromptProps = {
  /**
   * The already-translated question line above the square. Omitted where
   * the setup screen has already said what is asked (square colours, as the
   * web's session shows the square alone).
   */
  question?: string;
  /** The square being asked about, shown as the screen's focal point. */
  square: string;
  /**
   * The square's colour, for a quiz that answers on the square itself (the
   * web's square colours turns it green or red). Defaults to the text colour.
   */
  squareColor?: string;
  /**
   * The square's type size, set solid (line height equal to it), for a quiz
   * that follows a web size other than the 72pt default (square colours:
   * the web's 60px `text-6xl`, whose line height is 1).
   */
  squareSize?: number;
  /**
   * The feedback slot under the square. Each quiz reserves its own height
   * and type size here, because how much feedback there is to show differs
   * — square-colors answers in one word, the diagonal quiz names two
   * diagonals — and a reserved slot is what stops the square from jumping
   * when the answer appears.
   */
  children?: ReactNode;
};

/**
 * The "what colour / which diagonal is this square?" prompt: a question
 * line, the square itself at display size, and a slot for feedback.
 *
 * Shared because the square is the screen in these quizzes — the same
 * 72pt tabular-figure treatment, the same centred column, the same gap —
 * and the two that had it written out separately had already drifted apart
 * in the feedback slot alone.
 */
export function SquarePrompt({
  question,
  square,
  squareColor,
  squareSize,
  children,
}: SquarePromptProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {question ? (
        <Text style={[styles.questionLabel, { color: colors.mutedForeground }]}>
          {question}
        </Text>
      ) : null}

      <Text
        style={[
          styles.squareText,
          { color: squareColor ?? colors.foreground },
          squareSize !== undefined && {
            fontSize: squareSize,
            lineHeight: squareSize,
          },
        ]}
      >
        {square}
      </Text>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
  },
  questionLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  squareText: {
    fontSize: 72,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
