import { useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";

import {
  ChessBoard,
  QuizTimer,
  FeedbackOverlay,
} from "../../../../features/coordinate-quiz/components";
import {
  useQuizSession,
  useQuizTimer,
} from "../../../../features/coordinate-quiz/hooks";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";
import type {
  QuizSettings,
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

  // Parse settings from URL params
  const settings: QuizSettings = {
    timeLimit: parseInt(params.duration || "60", 10),
    orientation: (params.orientation || "white") as BoardOrientation,
    feedbackSpeed: (params.feedbackSpeed || "normal") as FeedbackSpeed,
    mode: "timed",
  };

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
    correctCount,
    totalCount,
    feedback,
    isProcessing,
    startSession,
    handleSquareTap,
    endSession,
  } = useQuizSession({
    settings,
    onComplete: handleComplete,
  });

  const { timeRemaining, progress, start } = useQuizTimer({
    duration: settings.timeLimit,
    onTimeUp: endSession,
  });

  // Start session and timer on mount
  useEffect(() => {
    startSession();
    start();
  }, [startSession, start]);

  const wrongCount = totalCount - correctCount;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
            <Text style={[styles.turnText, { color: colors.mutedForeground }]}>
              {currentQuestion?.orientation === "white"
                ? t("coordinateQuiz.session.whiteToMove")
                : t("coordinateQuiz.session.blackToMove")}
            </Text>
          </View>

          <View style={styles.timerContainer}>
            <QuizTimer
              timeRemaining={timeRemaining}
              progress={progress}
              size={50}
            />
          </View>
        </View>

        {/* Board Wrapper */}
        <View style={styles.boardWrapper}>
          <ChessBoard
            orientation={currentQuestion?.orientation ?? "white"}
            targetSquare={currentQuestion?.targetSquare ?? null}
            feedback={feedback}
            onSquarePress={handleSquareTap}
            disabled={isProcessing || !currentQuestion}
          />

          {/* Target Overlay */}
          {currentQuestion && !feedback && (
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
          <FeedbackOverlay feedback={feedback} />
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
            {wrongCount}
          </Text>
        </View>
      </View>
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
