import { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import {
  ALGEBRAIC_NOTATION_QUESTIONS,
  type AlgebraicNotationResult,
  getQuestionDescription,
  isCorrectAnswer,
} from "@blindfold-chess/features/algebraic-notation";
import { useAlgebraicNotationSession } from "@blindfold-chess/features/algebraic-notation/client";

import { Button, Screen } from "../../../../components";
import {
  AnswerFeedback,
  AnswerOptions,
  MoveBoard,
} from "../../../../features/algebraic-notation/components";
import { useQuestionLocale } from "../../../../features/algebraic-notation/hooks";
import { useTheme, fontSize, spacing } from "../../../../theme";

/**
 * Untimed, so it does not use `PracticeSessionScreen` (whose frame is the
 * countdown overlay, the clock and the running score). The body scrolls
 * because the explanation under the board can be longer than the screen.
 */
export default function AlgebraicNotationSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const locale = useQuestionLocale();

  const handleComplete = useCallback(
    ({ score, total }: AlgebraicNotationResult) => {
      router.replace({
        pathname: "/(tabs)/practice/algebraic-notation/result",
        params: { score: score.toString(), total: total.toString() },
      });
    },
    [router],
  );

  const {
    question,
    currentIndex,
    total,
    selectedAnswer,
    answered,
    isLastQuestion,
    selectOption,
    next,
  } = useAlgebraicNotationSession({
    questions: ALGEBRAIC_NOTATION_QUESTIONS,
    onComplete: handleComplete,
  });

  const handleSelect = (option: string) => {
    if (answered) return;
    Haptics.notificationAsync(
      isCorrectAnswer(question, option)
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    selectOption(option);
  };

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.progress, { color: colors.mutedForeground }]}>
          {t("algebraicNotation.session.progress", {
            current: currentIndex + 1,
            total,
          })}
        </Text>

        <Text style={[styles.description, { color: colors.foreground }]}>
          {getQuestionDescription(question, locale)}
        </Text>

        <MoveBoard
          key={question.id}
          fenBefore={question.fenBefore}
          fenAfter={question.fenAfter}
        />

        <AnswerOptions
          question={question}
          selectedAnswer={selectedAnswer}
          answered={answered}
          onSelect={handleSelect}
        />

        {answered && (
          <View style={styles.feedback}>
            <AnswerFeedback
              question={question}
              selectedAnswer={selectedAnswer}
            />
            <Button
              title={
                isLastQuestion
                  ? t("algebraicNotation.session.complete")
                  : t("algebraicNotation.session.next")
              }
              onPress={next}
              size="lg"
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  progress: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  description: {
    fontSize: fontSize.md,
  },
  feedback: {
    gap: spacing.md,
  },
});
