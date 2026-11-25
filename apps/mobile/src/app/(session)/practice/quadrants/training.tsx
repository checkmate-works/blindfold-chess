import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";
import {
  checkQuadrantAnswer,
  generateQuadrantQuestionBatch,
  getCorrectQuadrant,
  quadrantFeedbackDuration,
} from "@blindfold-chess/features/quadrants";
import type {
  QuadrantId,
  QuadrantQuestion,
} from "@blindfold-chess/features/quadrants";
import { isBoardOrientation } from "@blindfold-chess/types";

import { PracticeTrainingScreen } from "../../../../components";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { QuestionPanel } from "../../../../features/quadrants/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { spacing } from "../../../../theme";

const BATCH_SIZE = 100;

/**
 * Untimed quadrants drill: no clock and no lives, from the side picked on
 * the setup screen. As in the timed run, the board marks the right quarter
 * (and a wrong pick) while the feedback shows.
 */
export default function QuadrantsTraining() {
  const { close } = useCloseSession();
  const params = useLocalSearchParams<{ orientation: string }>();
  const orientation = isBoardOrientation(params.orientation)
    ? params.orientation
    : "white";

  const {
    currentQuestion,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
  } = useBatchTrainingSession<QuadrantQuestion, QuadrantId>({
    batchSize: BATCH_SIZE,
    generateBatch: () => generateQuadrantQuestionBatch(BATCH_SIZE, orientation),
    checkAnswer: (question, selectedQuadrant) =>
      checkQuadrantAnswer(question.square, selectedQuadrant),
    feedbackDelayMs: quadrantFeedbackDuration,
  });

  const onAnswer = useCallback(
    (selectedQuadrant: QuadrantId) =>
      handleAnswer(selectedQuadrant, false, answerHaptics),
    [handleAnswer],
  );

  const answered =
    showResult && lastAnswer && !lastAnswer.skipped ? lastAnswer : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentQuestion !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onEnd={close}
    >
      <View style={styles.body}>
        {currentQuestion && (
          <QuestionPanel
            question={currentQuestion}
            correctQuadrant={
              answered ? getCorrectQuadrant(answered.question.square) : null
            }
            wrongQuadrant={
              answered && !answered.correct ? answered.userAnswerData : null
            }
            onAnswer={onAnswer}
            disabled={showResult}
          />
        )}
      </View>
    </PracticeTrainingScreen>
  );
}

/**
 * Stacked from the top with the score and End right under the board, as
 * the web's training page (its p-6 around the play area).
 */
const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
