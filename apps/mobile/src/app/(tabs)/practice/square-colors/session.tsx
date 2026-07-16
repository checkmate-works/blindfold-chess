import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useSquareColorsSession } from "@blindfold-chess/features/square-colors/client";
import type { SquareColorsResult } from "@blindfold-chess/features/square-colors";

import { CountdownOverlay, ScoreFooter } from "../../../../components";
import {
  SquareQuestion,
  ColorButtons,
} from "../../../../features/square-colors/components";
import { QuizTimer } from "../../../../features/coordinate-quiz/components";
import { useTheme, spacing } from "../../../../theme";

export default function SquareColorsSession() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    timeLimit: string;
  }>();

  const duration = parseInt(params.timeLimit || "60", 10);

  const handleComplete = useCallback(
    (result: SquareColorsResult) => {
      router.replace({
        pathname: "/(tabs)/practice/square-colors/result",
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

  const handleAnswerEffect = useCallback((correct: boolean) => {
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }, []);

  const {
    currentSquare,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    handleAnswer,
  } = useSquareColorsSession({
    timeLimit: duration,
    onComplete: handleComplete,
    onAnswerEffect: handleAnswerEffect,
  });

  const progress = timeRemaining / duration;

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
            {currentSquare && (
              <SquareQuestion
                square={currentSquare}
                isCorrect={showFeedback ? lastAnswerCorrect : null}
              />
            )}
          </View>

          {/* Color Buttons */}
          <View style={styles.buttonsContainer}>
            <ColorButtons onAnswer={handleAnswer} disabled={showFeedback} />
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
