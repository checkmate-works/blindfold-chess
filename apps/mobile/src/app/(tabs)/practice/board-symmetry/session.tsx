import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useBoardSymmetrySession } from "@blindfold-chess/features/board-symmetry/client";

import {
  PracticeSessionScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  SymmetryQuestion,
  CoordinateSelector,
} from "../../../../features/board-symmetry/components";
import type { BoardSymmetryResult } from "@blindfold-chess/features/board-symmetry";

export default function BoardSymmetrySession() {
  const router = useRouter();
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
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / duration}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
    >
      <View style={practiceSessionStyles.questionContainer}>
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

      <View style={practiceSessionStyles.bottomSection}>
        <CoordinateSelector
          selectedFile={selectedFile}
          selectedRank={selectedRank}
          onFileToggle={handleFileToggle}
          onRankToggle={handleRankToggle}
          disabled={showFeedback}
        />
      </View>
    </PracticeSessionScreen>
  );
}
