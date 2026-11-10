import { useCallback, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

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

import {
  PracticeTrainingScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  DiagonalInputFields,
  FileRankButtons,
  QuestionCard,
  TrainingAnswerReview,
} from "../../../../features/diagonal-quiz/components";
import type { ActiveField } from "../../../../features/diagonal-quiz/hooks";
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
  const router = useRouter();

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
  const { reset: resetInput, setActiveField } = input;

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

  const handleFieldPress = (field: ActiveField) => {
    if (isDisabled) return;
    setActiveField(field);
  };

  // The answer on screen, while its result shows. A wrong or skipped one is
  // reviewed in place of the input until Next; a right one only flashes.
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

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentSquare !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onSkip={isDisabled ? undefined : () => handleSkip(answerHaptics)}
      onEnd={() => router.back()}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={practiceSessionStyles.bottomSection}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentSquare && (
          // The review card below carries the correct answer, so the
          // card's own "correct answer" line is not passed (`lastAnswer`).
          <QuestionCard
            square={currentSquare}
            isCorrect={shown ? shown.correct : null}
            lastAnswer={null}
          />
        )}

        {reviewed && correctDiagonals ? (
          <TrainingAnswerReview
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
          <>
            <View style={styles.inputSection}>
              <DiagonalInputFields
                diagonalStartText={input.diagonalStartText}
                diagonalEndText={input.diagonalEndText}
                antiDiagonalStartText={input.antiDiagonalStartText}
                antiDiagonalEndText={input.antiDiagonalEndText}
                activeField={input.activeField}
                isDiagonalComplete={input.isDiagonalComplete}
                isAntiDiagonalComplete={input.isAntiDiagonalComplete}
                isInputtingStart={input.isInputtingStart}
                isInputtingEnd={input.isInputtingEnd}
                singleDiagonal={singleDiagonal}
                singleAntiDiagonal={singleAntiDiagonal}
                disabled={isDisabled}
                onFieldPress={handleFieldPress}
              />
            </View>

            <View style={styles.buttonsSection}>
              <FileRankButtons
                expectingFile={input.expectingFile}
                expectingRank={input.expectingRank}
                disabled={isDisabled}
                onFilePress={input.handleFilePress}
                onRankPress={input.handleRankPress}
                onBackspace={input.handleBackspace}
                onClear={input.handleClear}
              />
            </View>
          </>
        )}
      </ScrollView>
    </PracticeTrainingScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  inputSection: {
    marginTop: spacing.lg,
  },
  buttonsSection: {
    marginTop: spacing.lg,
  },
});
