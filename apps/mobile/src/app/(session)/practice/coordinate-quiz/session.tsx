import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCoordinateQuizSession } from "@blindfold-chess/features/coordinate-quiz/client";

import {
  CountdownOverlay,
  QuizTimer,
  ScoreFooter,
  Screen,
} from "../../../../components";
import {
  QuizBoard,
  TurnIndicator,
} from "../../../../features/coordinate-quiz/components";
import { SessionCloseButton } from "../../../../navigation/SessionCloseButton";
import { spacing } from "../../../../theme";
import {
  BOARD_ORIENTATIONS,
  DEFAULT_QUIZ_SETTINGS,
} from "../../../../features/coordinate-quiz/lib/types";
import type {
  QuizResult,
  BoardOrientation,
} from "../../../../features/coordinate-quiz/lib/types";
import { parseEnumParam, parseIntParam } from "../../../../lib/route-params";

export default function CoordinateQuizSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    duration: string;
    orientation: string;
  }>();

  const timeLimit = parseIntParam(params.duration, {
    min: 1,
    fallback: DEFAULT_QUIZ_SETTINGS.timeLimit,
  });
  const orientation = parseEnumParam<BoardOrientation>(
    params.orientation,
    BOARD_ORIENTATIONS,
    "white",
  );

  const handleComplete = useCallback(
    (result: QuizResult) => {
      router.replace({
        pathname: "/practice/coordinate-quiz/result",
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
    <Screen>
      <CountdownOverlay countdown={countdown} />

      {/* Main content */}
      {countdown === null && (
        <>
          {/* Board Container with Overlay */}
          <View style={styles.boardContainer}>
            {/* Turn Indicator Row with Timer */}
            <View style={styles.turnRow}>
              <View style={styles.closeContainer}>
                <SessionCloseButton confirm />
              </View>
              <TurnIndicator question={currentQuestion} />

              <View style={styles.timerContainer}>
                <QuizTimer
                  timeRemaining={timeRemaining}
                  progress={timeRemaining / timeLimit}
                  size={50}
                />
              </View>
            </View>

            <QuizBoard
              question={currentQuestion}
              feedback={feedbackValue}
              onSquarePress={handleAnswer}
            />
          </View>

          <ScoreFooter
            correctCount={correctCount}
            incorrectCount={incorrectCount}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  closeContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  timerContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
