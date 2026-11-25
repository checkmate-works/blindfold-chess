import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import {
  type AlgebraicNotationQuestion,
  getQuestionExplanation,
  isCorrectAnswer,
} from "@blindfold-chess/features/algebraic-notation";

import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  monoFont,
  withAlpha,
} from "../../../theme";
import { useQuestionLocale } from "../hooks";

type AnswerFeedbackProps = {
  question: AlgebraicNotationQuestion;
  selectedAnswer: string;
};

/**
 * The web's answer review: the verdict in green or red and the correct
 * answer under it, centred; then the explanation bullets on a muted panel
 * (`bg-muted/50`, `bg-secondary` in dark mode), each bullet hanging so a
 * wrapped line starts under the text rather than under the dot.
 */
export function AnswerFeedback({
  question,
  selectedAnswer,
}: AnswerFeedbackProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors, isDark } = useTheme();
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
          <Text style={styles.answerValue}>{question.correctAnswer}</Text>
        </Text>
      </View>

      <View
        style={[
          styles.explanation,
          {
            backgroundColor: isDark
              ? colors.secondary
              : withAlpha(colors.muted, 0.5),
          },
        ]}
      >
        <Text style={[styles.explanationTitle, { color: colors.foreground }]}>
          {t("algebraicNotation.session.explanation")}
        </Text>
        <View style={styles.points}>
          {getQuestionExplanation(question, locale).map((point, index) => (
            <View key={index} style={styles.point}>
              <Text
                style={[styles.pointText, { color: colors.mutedForeground }]}
              >
                •
              </Text>
              <Text
                style={[
                  styles.pointText,
                  styles.pointBody,
                  { color: colors.mutedForeground },
                ]}
              >
                {point}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // `gap-6` between the verdict and the explanation.
  container: {
    gap: spacing.lg,
  },
  verdict: {
    alignItems: "center",
  },
  // `text-lg font-semibold mb-2`.
  verdictText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  answerText: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  answerValue: {
    fontFamily: monoFont,
    fontWeight: fontWeight.bold,
  },
  // `rounded-md p-4`.
  explanation: {
    borderRadius: 6,
    padding: spacing.md,
  },
  // `text-sm font-medium mb-3`.
  explanationTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.md - spacing.xs,
  },
  // `space-y-1`.
  points: {
    gap: spacing.xs,
  },
  point: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pointText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  pointBody: {
    flex: 1,
  },
});
