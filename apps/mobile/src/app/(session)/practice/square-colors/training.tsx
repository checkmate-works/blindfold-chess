import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { generateSquareSequence } from "@blindfold-chess/features/common";
import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";
import { getSquareColor } from "@blindfold-chess/features/square-colors";

import { PracticeTrainingScreen } from "../../../../components";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { QuestionPanel } from "../../../../features/square-colors/components";
import type { SquareColor } from "../../../../features/square-colors/lib/types";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { useGamePreferences } from "../../../../lib/game-preferences";
import { spacing } from "../../../../theme";

const BATCH_SIZE = 100;

/**
 * Untimed square-colours drill. Like the web training screen, the answer
 * buttons take the player's board theme from the global board preferences.
 */
export default function SquareColorsTraining() {
  const { close } = useCloseSession();
  const { preferences, isLoaded } = useGamePreferences();

  const {
    currentQuestion: currentSquare,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
  } = useBatchTrainingSession<string, SquareColor>({
    batchSize: BATCH_SIZE,
    generateBatch: () => generateSquareSequence(BATCH_SIZE),
    checkAnswer: (square, selectedColor) =>
      selectedColor === getSquareColor(square),
    feedbackDelayMs: 500,
  });

  const onAnswer = useCallback(
    (selectedColor: SquareColor) =>
      handleAnswer(selectedColor, false, answerHaptics),
    [handleAnswer],
  );

  const answered =
    showResult && lastAnswer?.skipped === false ? lastAnswer : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentSquare !== null && isLoaded}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onEnd={close}
    >
      <View style={styles.body}>
        <QuestionPanel
          square={currentSquare}
          verdict={answered?.correct ?? null}
          answeredColor={answered?.userAnswerData ?? null}
          onAnswer={onAnswer}
          disabled={showResult}
          boardTheme={preferences.boardTheme}
        />
      </View>
    </PracticeTrainingScreen>
  );
}

/**
 * Stacked from the top with the score and End right under the buttons, as
 * the web's training page (its p-8 around the panel).
 */
const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
