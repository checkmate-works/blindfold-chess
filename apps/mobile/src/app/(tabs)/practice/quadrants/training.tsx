import { useCallback } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";
import {
  checkQuadrantAnswer,
  generateQuadrantQuestionBatch,
  getCorrectQuadrant,
  quadrantFeedbackDuration,
} from "@blindfold-chess/features/quadrants";
import type {
  QuadrantId,
  QuadrantQuestion as Question,
} from "@blindfold-chess/features/quadrants";
import { isBoardOrientation } from "@blindfold-chess/types";

import {
  PracticeTrainingScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  QuadrantBoard,
  QuadrantQuestion,
} from "../../../../features/quadrants/components";
import { answerHaptics } from "../../../../lib/answer-haptics";

const BATCH_SIZE = 100;

/**
 * Untimed quadrants drill: no clock and no lives. As in the timed run, the
 * board marks the right quadrant (and a wrong pick) while the feedback shows.
 */
export default function QuadrantsTraining() {
  const router = useRouter();
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
  } = useBatchTrainingSession<Question, QuadrantId>({
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
  const correctQuadrant = answered
    ? getCorrectQuadrant(answered.question.square)
    : null;
  const wrongQuadrant =
    answered && !answered.correct ? answered.userAnswerData : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentQuestion !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onEnd={() => router.back()}
    >
      {currentQuestion && (
        <>
          <View style={practiceSessionStyles.questionContainer}>
            <QuadrantQuestion
              question={currentQuestion}
              isCorrect={answered ? answered.correct : null}
            />
          </View>

          <View style={practiceSessionStyles.bottomSection}>
            <QuadrantBoard
              orientation={currentQuestion.orientation}
              correctQuadrant={correctQuadrant}
              wrongQuadrant={wrongQuadrant}
              onQuadrantPress={onAnswer}
              disabled={showResult}
            />
          </View>
        </>
      )}
    </PracticeTrainingScreen>
  );
}
