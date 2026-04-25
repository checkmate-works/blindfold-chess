import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";

import {
  QuestionCard,
  LegalIllegalButtons,
} from "../../../../features/legal-moves/components";
import { QuizTimer } from "../../../../features/coordinate-quiz/components";
import { useLegalMovesSession } from "@blindfold-chess/features/legal-moves/client";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";
import type { PieceType } from "../../../../features/legal-moves/lib/types";
import type { LegalMovesResult } from "../../../../features/legal-moves/hooks";

export default function LegalMovesSession() {
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const params = useLocalSearchParams<{
    duration: string;
    pieces: string;
  }>();

  const duration = parseInt(params.duration || "60", 10);
  const selectedPieces = (params.pieces || "b,n,r,q,k").split(
    ",",
  ) as PieceType[];

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
      {/* Countdown overlay */}
      {countdown !== null && (
        <View style={styles.countdownContainer}>
          <Text style={[styles.countdownText, { color: colors.primary }]}>
            {countdown > 0 ? countdown : "START!"}
          </Text>
        </View>
      )}

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

          {/* Score */}
          <View style={styles.footer}>
            <View style={styles.scoreItem}>
              <View style={[styles.iconContainer, styles.correctIconBg]}>
                <Check size={16} color={feedbackColors.success} />
              </View>
              <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                {correctCount}
              </Text>
            </View>

            <View style={styles.scoreItem}>
              <View style={[styles.iconContainer, styles.wrongIconBg]}>
                <X size={16} color={feedbackColors.error} />
              </View>
              <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                {incorrectCount}
              </Text>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  countdownContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: {
    fontSize: 72,
    fontWeight: fontWeight.bold,
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  scoreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    padding: spacing.xs,
    borderRadius: 999,
  },
  correctIconBg: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  wrongIconBg: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
