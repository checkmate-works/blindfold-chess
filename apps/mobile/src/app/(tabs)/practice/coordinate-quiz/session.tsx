import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCoordinateQuizSession } from "@blindfold-chess/features/coordinate-quiz/client";

import {
  CountdownOverlay,
  QuizTimer,
  ScoreFooter,
} from "../../../../components";
import {
  ChessBoard,
  FeedbackOverlay,
} from "../../../../features/coordinate-quiz/components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";
import {
  BOARD_ORIENTATIONS,
  FEEDBACK_SPEEDS,
} from "../../../../features/coordinate-quiz/lib/types";
import type {
  QuizResult,
  BoardOrientation,
  FeedbackSpeed,
} from "../../../../features/coordinate-quiz/lib/types";
import { parseEnumParam, parseIntParam } from "../../../../lib/route-params";

export default function CoordinateQuizSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    duration: string;
    orientation: string;
    feedbackSpeed: string;
  }>();

  const timeLimit = parseIntParam(params.duration, { min: 1, fallback: 60 });
  const orientation = parseEnumParam<BoardOrientation>(
    params.orientation,
    BOARD_ORIENTATIONS,
    "white",
  );
  const feedbackSpeed = parseEnumParam<FeedbackSpeed>(
    params.feedbackSpeed,
    FEEDBACK_SPEEDS,
    "normal",
  );

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
      <CountdownOverlay countdown={countdown} />

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
});
