import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import type { BoardSymmetryProblem } from "@blindfold-chess/features/board-symmetry";
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
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";

const SETTINGS = {};

/**
 * The board-symmetry challenge (the web's `/board-symmetry/challenge`):
 * 60 seconds, ends at the mistake limit; recorded when signed in.
 */
export default function BoardSymmetryChallenge() {
  return (
    <ChallengeAttemptGate<BoardSymmetryProblem>
      menuType="board_symmetry"
      settings={SETTINGS}
    >
      {(attempt) => (
        <BoardSymmetrySession
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function BoardSymmetrySession({
  attemptId,
  remote,
}: {
  attemptId: string | null;
  remote: RemoteChallengePort<BoardSymmetryProblem> | undefined;
}) {
  const router = useRouter();
  const duration = CHALLENGE_TIME_LIMIT;

  const handleComplete = useCallback(
    (result: BoardSymmetryResult) => {
      router.replace({
        pathname: "/practice/board-symmetry/result",
        params: {
          ...serializePracticeStatsParams(result),
          ...(attemptId ? { attemptId } : {}),
        },
      });
    },
    [router, attemptId],
  );

  const {
    currentProblem,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    awaitingServer,
    lastAnswerCorrect,
    selectedFile,
    selectedRank,
    correctSolution,
    handleFileToggle,
    handleRankToggle,
    handleAnswer,
  } = useBoardSymmetrySession({
    timeLimit: duration,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
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
    if (
      selectedFile &&
      selectedRank &&
      !showFeedback &&
      !awaitingServer &&
      countdown === null
    ) {
      handleAnswer(selectedFile, selectedRank);
    }
  }, [
    selectedFile,
    selectedRank,
    showFeedback,
    awaitingServer,
    countdown,
    handleAnswer,
  ]);

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
          disabled={showFeedback || awaitingServer}
        />
      </View>
    </PracticeSessionScreen>
  );
}
