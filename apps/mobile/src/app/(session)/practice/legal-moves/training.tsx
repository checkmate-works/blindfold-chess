import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  LEGAL_MOVES_PIECE_SELECTIONS,
  generateBalancedMoveQuestions,
  isLegalMove,
  legalMovesPiecesForSelection,
  type LegalMovesPieceSelection,
} from "@blindfold-chess/features/legal-moves";
import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";

import { PracticeTrainingScreen } from "../../../../components";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { QuestionPanel } from "../../../../features/legal-moves/components";
import type {
  MoveQuestion,
  PieceType,
} from "../../../../features/legal-moves/lib/types";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";
import { spacing } from "../../../../theme";

const BATCH_SIZE = 100;

/**
 * Untimed legal-moves drill: the same question panel as the timed session,
 * with no clock and no end other than the player's.
 */
export default function LegalMovesTraining() {
  const { close } = useCloseSession();
  const params = useLocalSearchParams<{ piece: string }>();
  const selectedPieces: PieceType[] = legalMovesPiecesForSelection(
    parseEnumParam<LegalMovesPieceSelection>(
      params.piece,
      LEGAL_MOVES_PIECE_SELECTIONS,
      "random",
    ),
  );

  const {
    currentQuestion,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
  } = useBatchTrainingSession<MoveQuestion, boolean>({
    batchSize: BATCH_SIZE,
    generateBatch: () =>
      generateBalancedMoveQuestions(BATCH_SIZE, selectedPieces),
    checkAnswer: (question, userAnswer) =>
      userAnswer === isLegalMove(question.from, question.to, question.piece),
    feedbackDelayMs: 500,
  });

  const onAnswer = useCallback(
    (userAnswer: boolean) => handleAnswer(userAnswer, false, answerHaptics),
    [handleAnswer],
  );

  const answered =
    showResult && lastAnswer?.skipped === false ? lastAnswer : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentQuestion !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onEnd={close}
    >
      <View style={styles.body}>
        <QuestionPanel
          question={currentQuestion}
          verdict={answered?.correct ?? null}
          answeredLegal={answered?.userAnswerData ?? null}
          onAnswer={onAnswer}
          disabled={showResult}
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
