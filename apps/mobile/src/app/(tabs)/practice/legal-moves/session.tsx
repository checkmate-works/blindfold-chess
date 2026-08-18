import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";
import { useCallback } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import {
  PracticeSessionScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  QuestionCard,
  LegalIllegalButtons,
} from "../../../../features/legal-moves/components";
import { useLegalMovesSession } from "@blindfold-chess/features/legal-moves/client";
import { PIECE_TYPES } from "../../../../features/legal-moves/lib/types";
import type { PieceType } from "../../../../features/legal-moves/lib/types";
import {
  parseEnumListParam,
  parseIntParam,
} from "../../../../lib/route-params";
import type { LegalMovesResult } from "../../../../features/legal-moves/hooks";

export default function LegalMovesSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    duration: string;
    pieces: string;
  }>();

  const duration = parseIntParam(params.duration, { min: 1, fallback: 60 });
  const selectedPieces: PieceType[] = parseEnumListParam(
    params.pieces,
    PIECE_TYPES,
    PIECE_TYPES,
  );

  const handleComplete = useCallback(
    (result: LegalMovesResult) => {
      router.replace({
        pathname: "/(tabs)/practice/legal-moves/result",
        params: serializePracticeStatsParams(result),
      });
    },
    [router],
  );

  const {
    currentQuestion,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    handleAnswer,
  } = useLegalMovesSession({
    timeLimit: duration,
    selectedPieces,
    onComplete: handleComplete,
    onAnswerEffect: (correct) => {
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    },
  });

  const progress = timeRemaining / duration;
  const feedback: "correct" | "incorrect" | null = showFeedback
    ? lastAnswerCorrect
      ? "correct"
      : "incorrect"
    : null;

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={progress}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
    >
      <View style={practiceSessionStyles.questionContainer}>
        {currentQuestion && (
          <QuestionCard question={currentQuestion} feedback={feedback} />
        )}
      </View>

      <View style={practiceSessionStyles.bottomSection}>
        <LegalIllegalButtons
          onAnswer={handleAnswer}
          disabled={showFeedback || !currentQuestion}
        />
      </View>
    </PracticeSessionScreen>
  );
}
