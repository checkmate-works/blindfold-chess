import { useCallback, useEffect, useRef } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  FEEDBACK_FLASH_MS,
  generateSquareSequence,
} from "@blindfold-chess/features/common";
import {
  EXCLUDED_QUIZ_SQUARES,
  getCornerInfo,
  getDiagonals,
  scoreDiagonalAnswer,
} from "@blindfold-chess/features/diagonal-quiz";
import { useDiagonalInput } from "@blindfold-chess/features/diagonal-quiz/client";
import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";
import type { Square } from "@blindfold-chess/types";

import { PracticeTrainingScreen } from "../../../../components";
import { useCloseSession } from "../../../../navigation/use-close-session";
import {
  QuestionPanel,
  TrainingAnswerReview,
} from "../../../../features/diagonal-quiz/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { spacing } from "../../../../theme";

const BATCH_SIZE = 100;

type DiagonalAnswer = { diagonalAnswer: string; antiDiagonalAnswer: string };

/**
 * Untimed diagonal-quiz drill, matching the web training screen: a right
 * answer flashes and moves on, while a wrong or skipped one stays on screen
 * with the correct diagonals (and the player's own answer) until Next is
 * pressed. Skip is offered while a question is open.
 */
export default function DiagonalQuizTraining() {
  const { close } = useCloseSession();

  const {
    currentQuestion: currentSquare,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
    handleSkip,
    handleNextAfterSkip,
    handleNextAfterIncorrect,
  } = useBatchTrainingSession<Square, DiagonalAnswer>({
    batchSize: BATCH_SIZE,
    generateBatch: () =>
      generateSquareSequence(BATCH_SIZE, Math.random, EXCLUDED_QUIZ_SQUARES),
    checkAnswer: (square, { diagonalAnswer, antiDiagonalAnswer }) =>
      scoreDiagonalAnswer(square, diagonalAnswer, antiDiagonalAnswer).isCorrect,
    feedbackDelayMs: (isCorrect) =>
      isCorrect ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect,
    skipAutoAdvance: false,
    incorrectAutoAdvance: false,
  });

  const isDisabled = showResult;
  const { singleDiagonal, singleAntiDiagonal } = currentSquare
    ? getCornerInfo(currentSquare)
    : { singleDiagonal: false, singleAntiDiagonal: false };

  const onBothComplete = useCallback(
    (diagonalAnswer: string, antiDiagonalAnswer: string) => {
      if (isDisabled) return;
      handleAnswer(
        { diagonalAnswer, antiDiagonalAnswer },
        false,
        answerHaptics,
      );
    },
    [isDisabled, handleAnswer],
  );

  const input = useDiagonalInput({
    onBothComplete,
    disabled: isDisabled,
    allowSingleSquareDiagonal: singleDiagonal,
    allowSingleSquareAntiDiagonal: singleAntiDiagonal,
  });
  const { reset: resetInput } = input;

  // Clear the fields for every new question: when the square changes, and
  // when a result is dismissed (the next square can repeat the last one).
  const prevSquareRef = useRef(currentSquare);
  useEffect(() => {
    if (prevSquareRef.current !== currentSquare) {
      prevSquareRef.current = currentSquare;
      resetInput();
    }
  }, [currentSquare, resetInput]);
  const prevShowResultRef = useRef(showResult);
  useEffect(() => {
    if (prevShowResultRef.current && !showResult) resetInput();
    prevShowResultRef.current = showResult;
  }, [showResult, resetInput]);

  // The answer on screen, while its result shows. A right one tints both
  // fields green and moves on; a wrong or skipped one is reviewed in place
  // of the panel until Next.
  const shown = showResult ? lastAnswer : null;
  const reviewed = shown && !shown.correct ? shown : null;
  const correctDiagonals = reviewed ? getDiagonals(reviewed.question) : null;
  const userScore =
    reviewed && !reviewed.skipped
      ? scoreDiagonalAnswer(
          reviewed.question,
          reviewed.userAnswerData.diagonalAnswer,
          reviewed.userAnswerData.antiDiagonalAnswer,
        )
      : null;
  const fieldResult = shown?.correct ? "correct" : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentSquare !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onSkip={isDisabled ? undefined : () => handleSkip(answerHaptics)}
      onEnd={close}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {reviewed && correctDiagonals ? (
          <TrainingAnswerReview
            square={reviewed.question}
            correctDiagonal={correctDiagonals.diagonal}
            correctAntiDiagonal={correctDiagonals.antiDiagonal}
            userAnswer={
              userScore && !reviewed.skipped
                ? {
                    diagonal: reviewed.userAnswerData.diagonalAnswer,
                    antiDiagonal: reviewed.userAnswerData.antiDiagonalAnswer,
                    isDiagonalCorrect: userScore.isDiagonalCorrect,
                    isAntiDiagonalCorrect: userScore.isAntiDiagonalCorrect,
                  }
                : undefined
            }
            onNext={
              reviewed.skipped ? handleNextAfterSkip : handleNextAfterIncorrect
            }
          />
        ) : (
          <QuestionPanel
            square={currentSquare}
            input={input}
            singleDiagonal={singleDiagonal}
            singleAntiDiagonal={singleAntiDiagonal}
            disabled={isDisabled}
            diagonalResult={fieldResult}
            antiDiagonalResult={fieldResult}
          />
        )}
      </ScrollView>
    </PracticeTrainingScreen>
  );
}

/**
 * Stacked from the top with the score, Skip and End right under the keypad,
 * as the web's training page. Those three take more height than the
 * challenge's hearts and Quit, so the panel starts right under the header
 * and leaves 16 above the score rather than the web's 32: with the web's
 * spacing an iPhone 17 had to scroll to reach Clear. The body still
 * scrolls on a screen too short for it.
 */
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  body: {
    paddingBottom: spacing.md,
  },
});
