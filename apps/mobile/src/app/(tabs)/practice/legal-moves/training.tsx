import { useCallback } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  generateBalancedMoveQuestions,
  isLegalMove,
} from "@blindfold-chess/features/legal-moves";
import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";

import {
  PracticeTrainingScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  LegalIllegalButtons,
  QuestionCard,
} from "../../../../features/legal-moves/components";
import { PIECE_TYPES } from "../../../../features/legal-moves/lib/types";
import type {
  MoveQuestion,
  PieceType,
} from "../../../../features/legal-moves/lib/types";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumListParam } from "../../../../lib/route-params";

const BATCH_SIZE = 100;

/**
 * Untimed legal-moves drill: the same question and answer buttons as the
 * timed session, with no clock and no end other than the player's.
 */
export default function LegalMovesTraining() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pieces: string }>();
  const selectedPieces: PieceType[] = parseEnumListParam(
    params.pieces,
    PIECE_TYPES,
    PIECE_TYPES,
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
      onEnd={() => router.back()}
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
