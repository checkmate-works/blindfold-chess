import { useEffect, useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";

import {
  SymmetryQuestion,
  CoordinateSelector,
} from "../../../../features/board-symmetry/components";
import { QuizTimer } from "../../../../features/coordinate-quiz/components";
import {
  useBoardSymmetrySession,
  type BoardSymmetryResult,
} from "../../../../features/board-symmetry/hooks";
import { useQuizTimer } from "../../../../features/coordinate-quiz/hooks";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";

export default function BoardSymmetrySession() {
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const params = useLocalSearchParams<{
    timeLimit: string;
  }>();

  const duration = parseInt(params.timeLimit || "60", 10);

  const [countdown, setCountdown] = useState<number | null>(3);
  const [sessionStarted, setSessionStarted] = useState(false);

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
    problem,
    selectedFile,
    selectedRank,
    correctCount,
    incorrectCount,
    isCorrect,
    correctSolution,
    isProcessing,
    startSession,
    handleFileToggle,
    handleRankToggle,
    handleAnswer,
    endSession,
  } = useBoardSymmetrySession({
    duration,
    onComplete: handleComplete,
  });

  const { timeRemaining, progress, start } = useQuizTimer({
    duration,
    onTimeUp: endSession,
  });

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Start session and timer after countdown
  useEffect(() => {
    if (countdown === null && !sessionStarted) {
      setSessionStarted(true);
      startSession();
      start();
    }
  }, [countdown, sessionStarted, startSession, start]);

  // Auto-submit when both file and rank are selected
  useEffect(() => {
    if (
      selectedFile &&
      selectedRank &&
      !isProcessing &&
      isCorrect === null &&
      countdown === null
    ) {
      handleAnswer(selectedFile, selectedRank);
    }
  }, [
    selectedFile,
    selectedRank,
    isProcessing,
    isCorrect,
    countdown,
    handleAnswer,
  ]);

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
            {problem && (
              <SymmetryQuestion
                problem={problem}
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
              disabled={isProcessing}
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
  selectorContainer: {
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
