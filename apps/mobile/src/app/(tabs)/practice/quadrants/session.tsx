import { useCallback } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useQuadrantsSession } from "@blindfold-chess/features/quadrants/client";
import type { QuadrantsResult } from "@blindfold-chess/features/quadrants";
import { isBoardOrientation } from "@blindfold-chess/types";

import {
  PracticeSessionScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  QuadrantBoard,
  QuadrantQuestion,
} from "../../../../features/quadrants/components";
import {
  QUADRANTS_MISTAKE_LIMIT,
  QUADRANTS_TIME_LIMIT,
} from "../../../../features/quadrants/lib/constants";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";

export default function QuadrantsSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orientation: string }>();
  const orientation = isBoardOrientation(params.orientation)
    ? params.orientation
    : "white";

  const handleComplete = useCallback(
    (result: QuadrantsResult) => {
      router.replace({
        pathname: "/(tabs)/practice/quadrants/result",
        params: serializePracticeStatsParams(result),
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
    currentQuestion,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    correctQuadrant,
    wrongQuadrant,
    handleAnswer,
  } = useQuadrantsSession({
    orientation,
    timeLimit: QUADRANTS_TIME_LIMIT,
    mistakeAllowance: QUADRANTS_MISTAKE_LIMIT,
    onComplete: handleComplete,
    onAnswerEffect: handleAnswerEffect,
  });

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / QUADRANTS_TIME_LIMIT}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
    >
      {currentQuestion && (
        <>
          <View style={practiceSessionStyles.questionContainer}>
            <QuadrantQuestion
              question={currentQuestion}
              isCorrect={showFeedback ? lastAnswerCorrect : null}
              remainingLives={QUADRANTS_MISTAKE_LIMIT - incorrectCount}
              maxLives={QUADRANTS_MISTAKE_LIMIT}
            />
          </View>

          <View style={practiceSessionStyles.bottomSection}>
            <QuadrantBoard
              orientation={currentQuestion.orientation}
              correctQuadrant={correctQuadrant}
              wrongQuadrant={wrongQuadrant}
              onQuadrantPress={handleAnswer}
              disabled={showFeedback}
            />
          </View>
        </>
      )}
    </PracticeSessionScreen>
  );
}
