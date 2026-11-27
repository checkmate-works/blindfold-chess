import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core";
import {
  evaluatePuzzleSubmit,
  parseSolutionLines,
  type MoveSquares,
  type SessionState,
} from "@blindfold-chess/features/puzzle";

import { Button, Screen } from "../../../../components";
import { ButtonInput } from "../../../../features/ai-game/components";
import {
  examProblemOf,
  examRankOf,
} from "@blindfold-chess/features/dojo-journey";
import { BoardAccordion } from "../../../../features/puzzle/components/BoardAccordion";
import { PiecesInfo } from "../../../../features/puzzle/components/PiecesInfo";
import {
  fetchPuzzle,
  type Puzzle,
} from "../../../../features/puzzle/puzzles-api";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { SessionCloseButton } from "../../../../navigation/SessionCloseButton";
import {
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
  useTheme,
} from "../../../../theme";

/** How long "Correct! 🎉" stays up before the result replaces the session. */
const SOLVED_PAUSE_MS = 900;

/**
 * Solving one puzzle (the web's `/practice/puzzle/[id]/session`), stacked
 * as the web's panel is: the pieces as text, the board behind "Show Board"
 * (each opening counts as a peek), the SAN keypad, then "Show answer". The
 * header carries the puzzle's title, and after each right move the
 * opponent's reply with the progress ("● Black plays Nh2 (1/3)"), where the
 * web shows them as the page title. A wrong move says so under the keypad.
 *
 * Grading is the web's (`evaluatePuzzleSubmit`): any of the puzzle's
 * alternative lines is accepted until the first right move picks one. The
 * session closes without asking, as the web page can be left at any time.
 *
 * A dojo exam run (`exam` param, from `dojo/exams/[rank]`) solves the
 * exam's puzzle instead of fetching one, offers no "Show answer" (the exam
 * is to find it), and hands the player's own moves to the result screen,
 * which sends them for grading.
 */
export default function PuzzleSession() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string; exam?: string }>();
  const { id } = params;
  const [exam] = useState(() => {
    const rank = examRankOf(params.exam);
    const problem = examProblemOf(params.exam, "puzzle");
    return rank && problem ? { rank, problem } : undefined;
  });
  const [puzzle, setPuzzle] = useState<Puzzle | "notFound" | "failed" | null>(
    () =>
      exam
        ? {
            id: "",
            title: t("dojo.exam.title", {
              rank: t(`ranks.names.${exam.rank}`),
            }),
            fen: exam.problem.fen,
            description: null,
            solutions: exam.problem.solutions,
          }
        : null,
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerLeft: () => <SessionCloseButton /> });
  }, [navigation]);

  useEffect(() => {
    if (exam) return;
    let cancelled = false;
    void fetchPuzzle(id ?? "").then((result) => {
      if (!cancelled) setPuzzle(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id, exam]);

  if (puzzle === null || typeof puzzle === "string") {
    return (
      <Screen edges={["bottom"]}>
        <View style={styles.center}>
          {puzzle === null ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={{ color: colors.foreground }}>
              {t("puzzle.loadFailed")}
            </Text>
          )}
        </View>
      </Screen>
    );
  }
  return <PuzzleSolver puzzle={puzzle} exam={exam?.rank} />;
}

function PuzzleSolver({
  puzzle,
  exam,
}: {
  puzzle: Puzzle;
  /** The rank whose exam this puzzle is, for an exam run. */
  exam?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, feedbackColors } = useTheme();
  const { width } = useWindowDimensions();
  const parsed = useMemo(
    () => parseSolutionLines(puzzle.solutions),
    [puzzle.solutions],
  );
  const playerIsBlack = isBlackToMoveFromFen(puzzle.fen);
  const [session, setSession] = useState<SessionState>({
    currentFen: puzzle.fen,
    playerMoves: [],
    lockedSolutionIndex: null,
    attempts: [],
    lastOpponentMove: null,
  });
  const [lastMove, setLastMove] = useState<MoveSquares | null>(null);
  const [feedback, setFeedback] = useState<"incorrect" | "solved" | null>(null);
  const [peekCount, setPeekCount] = useState(0);
  const finished = useRef(false);

  const solved = feedback === "solved";
  const total =
    session.lockedSolutionIndex === null
      ? null
      : (parsed[session.lockedSolutionIndex]?.playerSlots.length ?? null);
  const title =
    session.lastOpponentMove !== null && !solved
      ? `${playerIsBlack ? "○" : "●"} ${t(
          playerIsBlack
            ? "puzzle.session.whitePlayed"
            : "puzzle.session.blackPlayed",
          { move: session.lastOpponentMove },
        )}${total === null ? "" : ` (${session.playerMoves.length}/${total})`}`
      : puzzle.title;

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const goToResult = (
    status: "solved" | "revealed",
    attempts: SessionState["attempts"],
    lineIndex: number,
    playerMoves: readonly string[],
  ) => {
    if (finished.current) return;
    finished.current = true;
    router.replace({
      pathname: "/practice/puzzle/result",
      params: {
        id: puzzle.id,
        title: puzzle.title,
        fen: puzzle.fen,
        status,
        attempts: JSON.stringify(attempts),
        solution: JSON.stringify(puzzle.solutions[lineIndex] ?? []),
        peekCount: String(peekCount),
        playerMoveCount: String(parsed[lineIndex]?.playerSlots.length ?? 0),
        // An exam run's answer: the player's own moves, in SAN.
        ...(exam ? { exam, moves: JSON.stringify(playerMoves) } : {}),
      },
    });
  };

  const handleSubmit = (san: string) => {
    if (solved) return;
    const outcome = evaluatePuzzleSubmit(
      session,
      san,
      parsed,
      puzzle.solutions,
    );
    setSession(outcome.nextSession);
    answerHaptics(outcome.kind === "accepted");
    if (outcome.kind !== "accepted") {
      setFeedback("incorrect");
      return;
    }
    setLastMove(outcome.opponentReply ?? outcome.playerMove);
    if (!outcome.solve) {
      setFeedback(null);
      return;
    }
    setFeedback("solved");
    const { attempts, lockedSolutionIndex, playerMoves } = outcome.nextSession;
    setTimeout(
      () =>
        goToResult("solved", attempts, lockedSolutionIndex ?? 0, playerMoves),
      SOLVED_PAUSE_MS,
    );
  };

  return (
    <Screen edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.panel, { borderColor: colors.border }]}>
          <PiecesInfo fen={puzzle.fen} />

          <BoardAccordion
            fen={session.currentFen}
            flipped={playerIsBlack}
            lastMove={lastMove}
            onOpen={() => setPeekCount((n) => n + 1)}
            maxSize={width - PANEL_INSET - 2}
            testID="puzzle-show-board"
          />

          <View style={styles.input}>
            <ButtonInput
              fen={session.currentFen}
              onSubmit={handleSubmit}
              disabled={solved}
              fitWidth
            />
            {feedback && (
              <Text
                accessibilityLiveRegion="polite"
                testID="puzzle-feedback"
                style={[
                  styles.feedback,
                  {
                    color: solved
                      ? feedbackColors.success
                      : feedbackColors.error,
                  },
                ]}
              >
                {solved
                  ? t("puzzle.session.correct")
                  : t("puzzle.session.incorrect")}
              </Text>
            )}
          </View>

          {!solved && !exam && (
            <Button
              title={t("puzzle.session.showAnswer")}
              variant="secondary"
              size="lg"
              fullWidth
              testID="puzzle-show-answer"
              onPress={() =>
                goToResult(
                  "revealed",
                  session.attempts,
                  session.lockedSolutionIndex ?? 0,
                  session.playerMoves,
                )
              }
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** The page's and the panel's padding on both sides, and the panel's border. */
const PANEL_INSET = spacing.md * 4 + 2;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.md,
  },
  // The web's `PagePanel` with `space-y-4` between its parts.
  panel: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  input: {
    gap: spacing.sm,
  },
  feedback: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
});
