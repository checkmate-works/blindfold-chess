import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import {
  ROUTE_PLANNER_CHALLENGE_PIECES,
  evaluateAttempt,
  type RoutePlannerChallengePiece,
  type RoutePlannerProblem,
  type RoutePlannerResult,
} from "@blindfold-chess/features/route-planner";
import {
  useRoutePlannerInput,
  useRoutePlannerSession,
} from "@blindfold-chess/features/route-planner/client";

import { Button, PracticeSessionScreen } from "../../../../components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import {
  ProblemCard,
  SquareInput,
} from "../../../../features/route-planner/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";
import { spacing } from "../../../../theme";

const PIECES = Object.keys(
  ROUTE_PLANNER_CHALLENGE_PIECES,
) as RoutePlannerChallengePiece[];

/**
 * The route-planner challenge (the web's `/route-planner/challenge`): routes
 * for one piece for 60 seconds, ending at the mistake limit; recorded when
 * signed in. There is no skip, as on the web.
 */
export default function RoutePlannerChallenge() {
  const params = useLocalSearchParams<{ piece: string }>();
  const selectedPiece = parseEnumParam<RoutePlannerChallengePiece>(
    params.piece,
    PIECES,
    "knight",
  );
  const settings = useMemo(() => ({ selectedPiece }), [selectedPiece]);
  return (
    <ChallengeAttemptGate<RoutePlannerProblem>
      menuType="route_planner"
      settings={settings}
    >
      {(attempt) => (
        <RoutePlannerChallengeRun
          selectedPiece={selectedPiece}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function RoutePlannerChallengeRun({
  selectedPiece,
  attemptId,
  remote,
}: {
  selectedPiece: RoutePlannerChallengePiece;
  attemptId: string | null;
  remote: RemoteChallengePort<RoutePlannerProblem> | undefined;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  // The same piece the server generates the attempt's problems for.
  const pieces = useMemo(
    () => [ROUTE_PLANNER_CHALLENGE_PIECES[selectedPiece]],
    [selectedPiece],
  );

  const handleComplete = useCallback(
    (result: RoutePlannerResult) => {
      router.replace({
        pathname: "/practice/route-planner/result",
        params: {
          correctCount: String(result.correctCount),
          totalProblems: String(result.totalProblems),
          accuracy: String(result.accuracy),
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
    handleAnswer,
  } = useRoutePlannerSession({
    selectedPieces: pieces,
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
    onComplete: handleComplete,
    onAnswerEffect: answerHaptics,
  });

  const disabled = showFeedback || awaitingServer || countdown !== null;
  const {
    moves,
    selectedFile,
    handleFilePress,
    handleRankPress,
    handleUndo,
    replaceMoves,
    reset,
  } = useRoutePlannerInput({ disabled });

  // A new problem starts with an empty route.
  const [shownProblem, setShownProblem] = useState(currentProblem);
  useEffect(() => {
    if (currentProblem !== shownProblem) {
      setShownProblem(currentProblem);
      reset();
    }
  }, [currentProblem, shownProblem, reset]);

  const handleSubmit = () => {
    if (!currentProblem || disabled) return;
    const attempt = evaluateAttempt(
      currentProblem.piece,
      currentProblem.start,
      moves,
      currentProblem.end,
    );
    replaceMoves(attempt.finalMoves);
    handleAnswer(attempt.success, attempt.finalMoves);
  };

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / CHALLENGE_TIME_LIMIT}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {currentProblem && (
          <ProblemCard
            problem={currentProblem}
            moves={moves}
            currentIndex={0}
            totalCount={1}
            feedback={
              showFeedback
                ? lastAnswerCorrect
                  ? "correct"
                  : "incorrect"
                : null
            }
          />
        )}
        <SquareInput
          selectedFile={selectedFile}
          disabled={disabled}
          onFilePress={handleFilePress}
          onRankPress={handleRankPress}
        />
        <View style={styles.actions}>
          <Button
            title={t("routePlanner.session.undo")}
            onPress={handleUndo}
            variant="outline"
            disabled={disabled || moves.length === 0}
            style={styles.action}
          />
          <Button
            title={t("routePlanner.session.submit")}
            onPress={handleSubmit}
            disabled={disabled || moves.length === 0}
            style={styles.action}
          />
        </View>
      </ScrollView>
    </PracticeSessionScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
