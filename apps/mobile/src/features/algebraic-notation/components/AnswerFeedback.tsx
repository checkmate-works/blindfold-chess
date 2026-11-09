import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import {
  type AlgebraicNotationQuestion,
  getQuestionExplanation,
  isCorrectAnswer,
} from "@blindfold-chess/features/algebraic-notation";

import { Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import { useQuestionLocale } from "../hooks";

type AnswerFeedbackProps = {
  question: AlgebraicNotationQuestion;
  selectedAnswer: string;
};

/** Right/wrong verdict, the correct answer, and the explanation bullets. */
export function AnswerFeedback({
  question,
  selectedAnswer,
}: AnswerFeedbackProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const locale = useQuestionLocale();
  const correct = isCorrectAnswer(question, selectedAnswer);

  return (
    <View style={styles.container}>
      <View style={styles.verdict}>
        <Text
          style={[
            styles.verdictText,
            { color: correct ? feedbackColors.success : feedbackColors.error },
          ]}
        >
          {correct
            ? t("algebraicNotation.session.correct")
            : t("algebraicNotation.session.incorrect")}
        </Text>
        <Text style={[styles.answerText, { color: colors.mutedForeground }]}>
          {t("algebraicNotation.session.correctAnswerIs")}{" "}
          <Text style={[styles.answerValue, { color: colors.foreground }]}>
            {question.correctAnswer}
          </Text>
        </Text>
      </View>

      <Card padding="md" shadow="none">
        <Text style={[styles.explanationTitle, { color: colors.foreground }]}>
          {t("algebraicNotation.session.explanation")}
        </Text>
        {getQuestionExplanation(question, locale).map((point, index) => (
          <Text
            key={index}
            style={[styles.explanationPoint, { color: colors.mutedForeground }]}
          >
            {`• ${point}`}
          </Text>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  verdict: {
    alignItems: "center",
    gap: spacing.xs,
  },
  verdictText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  answerText: {
    fontSize: fontSize.sm,
  },
  answerValue: {
    fontFamily: "Menlo",
    fontWeight: fontWeight.bold,
  },
  explanationTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  explanationPoint: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
});
