import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";

type QuestionCardProps = {
  square: string;
  isCorrect: boolean | null;
  lastAnswer: {
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null;
};

export function QuestionCard({
  square,
  isCorrect,
  lastAnswer,
}: QuestionCardProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  const getFeedbackText = () => {
    if (isCorrect === true) return t("diagonalQuiz.session.correct");
    if (isCorrect === false && lastAnswer) {
      return t("diagonalQuiz.session.correctAnswer", {
        diagonal: lastAnswer.correctDiagonal,
        antiDiagonal: lastAnswer.correctAntiDiagonal,
      });
    }
    return null;
  };

  const getFeedbackColor = () => {
    if (isCorrect === true) return feedbackColors.success;
    if (isCorrect === false) return feedbackColors.error;
    return colors.mutedForeground;
  };

  const feedbackText = getFeedbackText();

  return (
    <View style={styles.container}>
      <Text style={[styles.questionLabel, { color: colors.mutedForeground }]}>
        {t("diagonalQuiz.session.question", {
          square: square.toUpperCase(),
        })}
      </Text>

      <Text style={[styles.squareText, { color: colors.foreground }]}>
        {square}
      </Text>

      <View style={styles.feedbackContainer}>
        {feedbackText && (
          <Text style={[styles.feedbackText, { color: getFeedbackColor() }]}>
            {feedbackText}
          </Text>
        )}
      </View>
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
  feedbackContainer: {
    minHeight: 40,
    justifyContent: "center",
  },
  feedbackText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
});
