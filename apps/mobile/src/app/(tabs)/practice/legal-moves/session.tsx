import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { CountdownOverlay, ScoreFooter } from "../../../../components";
import {
  QuestionCard,
  LegalIllegalButtons,
} from "../../../../features/legal-moves/components";
import { QuizTimer } from "../../../../features/coordinate-quiz/components";
import { useLegalMovesSession } from "@blindfold-chess/features/legal-moves/client";
import { useTheme, spacing } from "../../../../theme";
import { PIECE_TYPES } from "../../../../features/legal-moves/lib/types";
import type { PieceType } from "../../../../features/legal-moves/lib/types";
import {
  parseEnumListParam,
  parseIntParam,
} from "../../../../lib/route-params";
import type { LegalMovesResult } from "../../../../features/legal-moves/hooks";

export default function LegalMovesSession() {
  const router = useRouter();
  const { colors } = useTheme();
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
        params: {
          correctAnswers: result.correctAnswers.toString(),
          incorrectAnswers: result.incorrectAnswers.toString(),
          totalQuestions: result.totalQuestions.toString(),
          accuracy: result.accuracy.toString(),
          timeTaken: result.timeTaken.toString(),
          averageTime: result.averageTime.toString(),
        },
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <CountdownOverlay countdown={countdown} />

      {/* Main content */}
      {countdown === null && (
        <>
          {/* Timer */}
          <View style={styles.timerRow}>
            <View style={styles.spacer} />
            <QuizTimer
              timeRemaining={timeRemaining}
              progress={progress}
              size={50}
            />
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            {currentQuestion && (
              <QuestionCard question={currentQuestion} feedback={feedback} />
            )}
          </View>

          {/* Answer buttons */}
          <View style={styles.buttonsContainer}>
            <LegalIllegalButtons
              onAnswer={handleAnswer}
              disabled={showFeedback || !currentQuestion}
            />
          </View>

          <ScoreFooter
            correctCount={correctCount}
            incorrectCount={incorrectCount}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  questionContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
