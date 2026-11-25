import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import {
  ROUTE_PLANNER_CHALLENGE_PIECES,
  generateProblem,
  getShortestPathOrEmpty,
  type RoutePlannerAttempt,
  type RoutePlannerChallengePiece,
} from "@blindfold-chess/features/route-planner";
import type { Square } from "@blindfold-chess/types";

import { Button, PracticeTrainingScreen } from "../../../../components";
import {
  ProblemFeedback,
  ProblemPanel,
} from "../../../../features/route-planner/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { spacing } from "../../../../theme";

type Outcome = {
  success: boolean;
  /** The route as graded, the goal appended; empty when skipped. */
  moves: Square[];
  shortestPath: Square[];
  skipped: boolean;
};

/**
 * Untimed route planner (the web's `/route-planner/training`): one problem
 * after another with the selected piece, until the player ends it. Each
 * answer keeps the problem's header and shows the route on a board, with
 * the shortest one, before Next Problem.
 */
export default function RoutePlannerTraining() {
  const { t } = useTranslation();
  const { close } = useCloseSession("/practice/route-planner");
  const params = useLocalSearchParams<{ piece: string }>();
  const piece = parseEnumParam<RoutePlannerChallengePiece>(
    params.piece,
    Object.keys(ROUTE_PLANNER_CHALLENGE_PIECES) as RoutePlannerChallengePiece[],
    "knight",
  );
  const pieces = useMemo(
    () => [ROUTE_PLANNER_CHALLENGE_PIECES[piece]],
    [piece],
  );

  const [problem, setProblem] = useState(() => generateProblem(pieces));
  // Keys the panel, so each problem starts with an empty route even when
  // two in a row happen to be the same.
  const [problemNumber, setProblemNumber] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const record = useCallback((next: Outcome) => {
    setOutcome(next);
    answerHaptics(next.success);
    if (next.success) setCorrectCount((n) => n + 1);
    else setIncorrectCount((n) => n + 1);
  }, []);

  const handleSubmit = useCallback(
    (attempt: RoutePlannerAttempt) => {
      record({
        success: attempt.success,
        moves: attempt.finalMoves,
        shortestPath: attempt.shortestPath,
        skipped: false,
      });
    },
    [record],
  );

  const handleSkip = () => {
    record({
      success: false,
      moves: [],
      shortestPath: getShortestPathOrEmpty(
        problem.piece,
        problem.start,
        problem.end,
      ),
      skipped: true,
    });
  };

  const handleNext = () => {
    setProblem(generateProblem(pieces));
    setProblemNumber((n) => n + 1);
    setOutcome(null);
  };

  return (
    <PracticeTrainingScreen
      isReady
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onSkip={outcome ? undefined : handleSkip}
      onEnd={close}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ProblemPanel
          key={problemNumber}
          problem={problem}
          verdict={outcome ? outcome.success : null}
          disabled={outcome !== null}
          onSubmit={handleSubmit}
          feedback={
            outcome && (
              <View style={styles.answered}>
                <ProblemFeedback
                  piece={problem.piece}
                  start={problem.start}
                  end={problem.end}
                  moves={outcome.moves}
                  shortestPath={outcome.shortestPath}
                  success={outcome.success}
                  skipped={outcome.skipped}
                />
                <Button
                  title={t("routePlanner.session.nextProblem")}
                  icon="refresh"
                  onPress={handleNext}
                  size="lg"
                  fullWidth
                  testID="route-next"
                />
              </View>
            )
          }
        />
      </ScrollView>
    </PracticeTrainingScreen>
  );
}

/**
 * Stacked from the top with the score, skip and End right under the panel,
 * as the web's training page; the scroll view takes only the content's
 * height and scrolls when the phone is too short for it.
 */
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    padding: spacing.lg,
  },
  /** The web's `space-y-6` between the feedback and Next Problem. */
  answered: {
    gap: 24,
  },
});
