import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { SquarePrompt } from "../../../components";
import { useFeedbackColor, fontSize, fontWeight } from "../../../theme";

type SquareQuestionProps = {
  square: string;
  isCorrect: boolean | null;
};

export function SquareQuestion({ square, isCorrect }: SquareQuestionProps) {
  const { t } = useTranslation();
  const feedbackColor = useFeedbackColor(isCorrect);

  const getFeedbackText = () => {
    if (isCorrect === true) return t("squareColors.session.correct");
    if (isCorrect === false) return t("squareColors.session.incorrect");
    return null;
  };

  const feedbackText = getFeedbackText();

  return (
    <SquarePrompt
      question={t("squareColors.session.question", {
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
    minHeight: 24,
  },
  feedbackText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
