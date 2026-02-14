import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";

type SquareQuestionProps = {
  square: string;
  isCorrect: boolean | null;
};

export function SquareQuestion({ square, isCorrect }: SquareQuestionProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  const getFeedbackText = () => {
    if (isCorrect === true) return t("squareColors.session.correct");
    if (isCorrect === false) return t("squareColors.session.incorrect");
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
        {t("squareColors.session.question", { square: square.toUpperCase() })}
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
    minHeight: 24,
  },
  feedbackText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
