import { useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  type ScrollViewInstance,
} from "react-native";
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

import { Button, ProgressBar, Screen } from "../../../../components";
import {
  AnswerFeedback,
  AnswerOptions,
  MoveBoard,
} from "../../../../features/algebraic-notation/components";
import { useQuestionLocale } from "../../../../features/algebraic-notation/hooks";
import { useTheme, fontSize, spacing } from "../../../../theme";

/**
 * The web's free-play session, stacked from the top under the module's
 * header (the × asks before leaving): the progress bar, the question, the
 * board, the choices, and once answered the verdict, the explanation and
 * Next where the web puts them, under the choices.
 *
 * Untimed, so it does not use `PracticeSessionScreen` (whose frame is the
 * countdown, the clock and the running score). The body scrolls, since
 * the explanation under the board is taller than the screen, and returns
 * to the top for each new question, as the web realigns its panel.
 */
export default function AlgebraicNotationSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const locale = useQuestionLocale();
  const scrollRef = useRef<ScrollViewInstance>(null);

  const handleComplete = useCallback(
    ({ score, total }: AlgebraicNotationResult) => {
      router.replace({
        pathname: "/practice/algebraic-notation/result",
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

  const handleNext = () => {
    next();
    if (!isLastQuestion) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  return (
    <Screen edges={["bottom"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <ProgressBar current={currentIndex + 1} total={total} />

        <Text style={[styles.description, { color: colors.mutedForeground }]}>
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
          <View style={styles.answered}>
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
              onPress={handleNext}
              size="lg"
              fullWidth
              testID="algebraic-notation-next"
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The web's `gap-6` between every block.
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  // `text-lg text-muted-foreground`.
  description: {
    fontSize: fontSize.lg,
    lineHeight: 26,
  },
  answered: {
    gap: spacing.lg,
  },
});
