import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useQuadrantsSession } from "@blindfold-chess/features/quadrants/client";
import type { QuadrantsResult } from "@blindfold-chess/features/quadrants";
import {
  MISTAKE_LIMIT,
  CHALLENGE_TIME_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import { isBoardOrientation } from "@blindfold-chess/types";

import { PracticeSessionScreen } from "../../../../components";
import { QuestionPanel } from "../../../../features/quadrants/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";
import { spacing } from "../../../../theme";

/**
 * The quadrants challenge (the web's `/quadrants/challenge/session`): 60
 * seconds, ends at the mistake limit. The server keeps no record of it, so
 * unlike the six ranked challenges it runs on the device whether or not the
 * player is signed in.
 */
export default function QuadrantsSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orientation: string }>();
  const orientation = isBoardOrientation(params.orientation)
    ? params.orientation
    : "white";

  const handleComplete = useCallback(
    (result: QuadrantsResult) => {
      router.replace({
        pathname: "/practice/quadrants/result",
        params: serializePracticeStatsParams(result),
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
    correctQuadrant,
    wrongQuadrant,
    handleAnswer,
  } = useQuadrantsSession({
    orientation,
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
    onComplete: handleComplete,
    onAnswerEffect: answerHaptics,
  });

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / CHALLENGE_TIME_LIMIT}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      lives={{
        remaining: Math.max(MISTAKE_LIMIT - incorrectCount, 0),
        max: MISTAKE_LIMIT,
      }}
      headerShown
      countdownInBody
    >
      <View style={styles.body}>
        {currentQuestion && (
          <QuestionPanel
            question={currentQuestion}
            correctQuadrant={correctQuadrant}
            wrongQuadrant={wrongQuadrant}
            onAnswer={handleAnswer}
            disabled={showFeedback}
            countdown={countdown}
          />
        )}
      </View>
    </PracticeSessionScreen>
  );
}

/**
 * Stacked from the top as the web's session is: 16 under the hearts and
 * clock (its `space-y-4`), 32 above the score (its `mt-8`). Centring the
 * board would open a gap between it and the question on a tall phone.
 */
const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
