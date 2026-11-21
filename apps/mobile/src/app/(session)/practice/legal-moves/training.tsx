import { useCallback } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  LEGAL_MOVES_PIECE_SELECTIONS,
  generateBalancedMoveQuestions,
  isLegalMove,
  legalMovesPiecesForSelection,
  type LegalMovesPieceSelection,
} from "@blindfold-chess/features/legal-moves";
import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";

import {
  PracticeTrainingScreen,
  practiceSessionStyles,
} from "../../../../components";
import { useCloseSession } from "../../../../navigation/use-close-session";
import {
  LegalIllegalButtons,
  QuestionCard,
} from "../../../../features/legal-moves/components";
import type {
  MoveQuestion,
  PieceType,
} from "../../../../features/legal-moves/lib/types";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";

const BATCH_SIZE = 100;

/**
 * Untimed legal-moves drill: the same question and answer buttons as the
 * timed session, with no clock and no end other than the player's.
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

  const feedback: "correct" | "incorrect" | null =
    showResult && lastAnswer
      ? lastAnswer.correct
        ? "correct"
        : "incorrect"
      : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentQuestion !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onEnd={close}
    >
      <View style={practiceSessionStyles.questionContainer}>
        {currentQuestion && (
          <QuestionCard question={currentQuestion} feedback={feedback} />
        )}
      </View>

      <View style={practiceSessionStyles.bottomSection}>
        <LegalIllegalButtons onAnswer={onAnswer} disabled={showResult} />
      </View>
    </PracticeTrainingScreen>
  );
}
