import { useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useBoardSymmetrySession } from "@blindfold-chess/features/board-symmetry/client";

import { CountdownOverlay, ScoreFooter } from "../../../../components";
import {
  SymmetryQuestion,
  CoordinateSelector,
} from "../../../../features/board-symmetry/components";
import { QuizTimer } from "../../../../features/coordinate-quiz/components";
import { useTheme, spacing } from "../../../../theme";
import type { BoardSymmetryResult } from "@blindfold-chess/features/board-symmetry";

export default function BoardSymmetrySession() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    timeLimit: string;
  }>();

  const duration = parseInt(params.timeLimit || "60", 10);

  const handleComplete = useCallback(
    (result: BoardSymmetryResult) => {
      router.replace({
        pathname: "/(tabs)/practice/board-symmetry/result",
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
    currentProblem,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    selectedFile,
    selectedRank,
    correctSolution,
    handleFileToggle,
    handleRankToggle,
    handleAnswer,
  } = useBoardSymmetrySession({
    timeLimit: duration,
    onComplete: handleComplete,
    onAnswerEffect: (correct) =>
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ),
  });

  const isCorrect = showFeedback ? lastAnswerCorrect : null;

  // Auto-submit when both file and rank are selected
  useEffect(() => {
    if (selectedFile && selectedRank && !showFeedback && countdown === null) {
      handleAnswer(selectedFile, selectedRank);
    }
  }, [selectedFile, selectedRank, showFeedback, countdown, handleAnswer]);

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
              progress={timeRemaining / duration}
              size={50}
            />
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            {currentProblem && (
              <SymmetryQuestion
                problem={currentProblem}
                selectedFile={selectedFile}
                selectedRank={selectedRank}
                isCorrect={isCorrect}
                correctSolution={correctSolution}
              />
            )}
          </View>

          {/* Coordinate Selector */}
          <View style={styles.selectorContainer}>
            <CoordinateSelector
              selectedFile={selectedFile}
              selectedRank={selectedRank}
              onFileToggle={handleFileToggle}
              onRankToggle={handleRankToggle}
              disabled={showFeedback}
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
  selectorContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
