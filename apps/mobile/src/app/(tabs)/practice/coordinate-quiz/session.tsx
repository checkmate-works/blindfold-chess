import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";
import { useCoordinateQuizSession } from "@blindfold-chess/features/coordinate-quiz/client";

import {
  ChessBoard,
  QuizTimer,
  FeedbackOverlay,
} from "../../../../features/coordinate-quiz/components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";
import type {
  QuizResult,
  BoardOrientation,
  FeedbackSpeed,
} from "../../../../features/coordinate-quiz/lib/types";

export default function CoordinateQuizSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const params = useLocalSearchParams<{
    duration: string;
    orientation: string;
    feedbackSpeed: string;
  }>();

  const timeLimit = parseInt(params.duration || "60", 10);
  const orientation = (params.orientation || "white") as BoardOrientation;
  const feedbackSpeed = (params.feedbackSpeed || "normal") as FeedbackSpeed;

  const handleComplete = useCallback(
    (result: QuizResult) => {
      router.replace({
        pathname: "/(tabs)/practice/coordinate-quiz/result",
        params: {
          totalQuestions: result.totalQuestions.toString(),
          correctAnswers: result.correctAnswers.toString(),
          accuracy: result.accuracy.toString(),
          averageTime: result.averageTime.toString(),
          points: result.points.toString(),
          timeTaken: result.timeTaken.toString(),
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
  } = useCoordinateQuizSession({
    timeLimit,
    orientation,
    feedbackSpeed,
    onComplete: handleComplete,
    onAnswerEffect: (correct) =>
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ),
  });

  const feedbackValue = showFeedback
    ? lastAnswerCorrect
      ? ("correct" as const)
      : ("incorrect" as const)
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
          {/* Board Container with Overlay */}
          <View style={styles.boardContainer}>
            {/* Turn Indicator Row with Timer */}
            <View style={styles.turnRow}>
              <View style={styles.turnIndicator}>
                <View
                  style={[
                    styles.turnDot,
                    {
                      backgroundColor:
                        currentQuestion?.orientation === "white"
                          ? colors.card
                          : colors.foreground,
                      borderColor: colors.foreground,
                    },
                  ]}
                />
                <Text
                  style={[styles.turnText, { color: colors.mutedForeground }]}
                >
                  {currentQuestion?.orientation === "white"
                    ? t("coordinateQuiz.session.whiteToMove")
                    : t("coordinateQuiz.session.blackToMove")}
                </Text>
              </View>

              <View style={styles.timerContainer}>
                <QuizTimer
                  timeRemaining={timeRemaining}
                  progress={timeRemaining / timeLimit}
                  size={50}
                />
              </View>
            </View>

            {/* Board Wrapper */}
            <View style={styles.boardWrapper}>
              <ChessBoard
                orientation={currentQuestion?.orientation ?? "white"}
                targetSquare={currentQuestion?.targetSquare ?? null}
                feedback={feedbackValue}
                onSquarePress={handleAnswer}
                disabled={!currentQuestion}
              />

              {/* Target Overlay */}
              {currentQuestion && !showFeedback && (
                <View style={styles.overlayContainer} pointerEvents="none">
                  <Text
                    style={[
                      styles.overlayText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {currentQuestion.targetSquare}
                  </Text>
                </View>
              )}

              {/* Feedback Overlay */}
              <FeedbackOverlay feedback={feedbackValue} />
            </View>
          </View>

          {/* Footer Score */}
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
  boardContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  turnRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    minHeight: 50,
    position: "relative",
  },
  turnIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  turnDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  turnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  timerContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  boardWrapper: {
    position: "relative",
    aspectRatio: 1,
    width: "100%",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overlayText: {
    fontSize: 64,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    elevation: 5,
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
