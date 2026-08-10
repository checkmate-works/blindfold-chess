import { useCallback } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { useSquareColorsSession } from "@blindfold-chess/features/square-colors/client";
import type { SquareColorsResult } from "@blindfold-chess/features/square-colors";

import {
  PracticeSessionScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  SquareQuestion,
  ColorButtons,
} from "../../../../features/square-colors/components";

export default function SquareColorsSession() {
  const router = useRouter();
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
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={progress}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
    >
      <View style={practiceSessionStyles.questionContainer}>
        {currentSquare && (
          <SquareQuestion
            square={currentSquare}
            isCorrect={showFeedback ? lastAnswerCorrect : null}
          />
        )}
      </View>

      <View style={practiceSessionStyles.bottomSection}>
        <ColorButtons onAnswer={handleAnswer} disabled={showFeedback} />
      </View>
    </PracticeSessionScreen>
  );
}
