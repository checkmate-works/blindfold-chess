import {
  useCallback,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  LEGAL_MOVES_PIECE_SELECTIONS,
  legalMovesPiecesForSelection,
  type LegalMovesPieceSelection,
  type LegalMovesResult,
  type MoveQuestion,
} from "@blindfold-chess/features/legal-moves";
import { useLegalMovesSession } from "@blindfold-chess/features/legal-moves/client";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";

import { PracticeSessionScreen } from "../../../../components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { attemptResultParams } from "../../../../features/challenge/attempt-result-params";
import { QuestionPanel } from "../../../../features/legal-moves/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";
import { parseEnumParam } from "../../../../lib/route-params";
import { spacing } from "../../../../theme";

/**
 * The legal-moves challenge (the web's `/legal-moves/challenge`) for one
 * piece selection; recorded when signed in.
 */
export default function LegalMovesChallenge() {
  const params = useLocalSearchParams<{ piece: string }>();
  const selectedPiece = parseEnumParam<LegalMovesPieceSelection>(
    params.piece,
    LEGAL_MOVES_PIECE_SELECTIONS,
    "random",
  );
  const settings = useMemo(() => ({ selectedPiece }), [selectedPiece]);
  return (
    <ChallengeAttemptGate<MoveQuestion>
      menuType="legal_moves"
      settings={settings}
    >
      {(attempt) => (
        <LegalMovesChallengeSession
          selectedPiece={selectedPiece}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function LegalMovesChallengeSession({
  selectedPiece,
  attemptId,
  remote,
}: {
  selectedPiece: LegalMovesPieceSelection;
  attemptId: string | null;
  remote: RemoteChallengePort<MoveQuestion> | undefined;
}) {
  const router = useRouter();
  // The same pieces the server generates the attempt's questions from.
  const selectedPieces = useMemo(
    () => legalMovesPiecesForSelection(selectedPiece),
    [selectedPiece],
  );

  // Whether the run lost the server, for `handleComplete`: the session
  // calls it from its completion effect, and every insertion effect of
  // that render (below) has run by then.
  const remoteFailedRef = useRef(false);

  const handleComplete = useCallback(
    (result: LegalMovesResult) => {
      router.replace({
        pathname: "/practice/legal-moves/result",
        params: {
          ...serializePracticeStatsParams(result),
          ...attemptResultParams(attemptId, remoteFailedRef.current),
        },
      });
    },
    [router, attemptId],
  );

  const {
    currentQuestion,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    awaitingServer,
    lastAnswerCorrect,
    handleAnswer,
    remoteFailed,
  } = useLegalMovesSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    selectedPieces,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
    onComplete: handleComplete,
    onAnswerEffect: answerHaptics,
  });
  useInsertionEffect(() => {
    remoteFailedRef.current = remoteFailed;
  });

  // The pressed button keeps its verdict ring until the next question,
  // including any wait for the server; a press meanwhile is ignored by the
  // session and must not move it. Only read while `showFeedback`.
  const [answeredLegal, setAnsweredLegal] = useState<boolean | null>(null);
  const inputDisabled =
    countdown !== null || showFeedback || awaitingServer || !currentQuestion;

  const onAnswer = useCallback(
    (isLegal: boolean) => {
      if (inputDisabled) return;
      setAnsweredLegal(isLegal);
      handleAnswer(isLegal);
    },
    [handleAnswer, inputDisabled],
  );

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
        <QuestionPanel
          question={currentQuestion}
          verdict={showFeedback ? lastAnswerCorrect : null}
          answeredLegal={answeredLegal}
          onAnswer={onAnswer}
          disabled={inputDisabled}
          countdown={countdown}
        />
      </View>
    </PracticeSessionScreen>
  );
}

/**
 * Stacked from the top as the web's session is: 24 under the hearts and
 * clock (the web's mb-8 less the question block's own centring), 32 above
 * the score (its mt-8).
 */
const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
