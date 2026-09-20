import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { SquarePrompt } from "../../../components";
import { useFeedbackColor, fontSize, fontWeight } from "../../../theme";

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
  const feedbackColor = useFeedbackColor(isCorrect);

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

  const feedbackText = getFeedbackText();

  return (
    <SquarePrompt
      question={t("diagonalQuiz.session.question", {
        square: square.toUpperCase(),
      })}
      square={square}
    >
      <View style={styles.feedbackContainer}>
        {feedbackText && (
          <Text style={[styles.feedbackText, { color: feedbackColor }]}>
            {feedbackText}
          </Text>
        )}
      </View>
    </SquarePrompt>
  );
}

const styles = StyleSheet.create({
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
