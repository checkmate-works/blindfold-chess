import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  fullmoveNumberFromFen,
  isBlackToMoveFromFen,
} from "@blindfold-chess/features/chess-core";
import type {
  Attempt,
  PuzzleSolutionMove,
} from "@blindfold-chess/features/puzzle";

import { BottomBar, Button, ListSection, Screen } from "../../../../components";
import { useAuth } from "../../../../auth/use-auth";
import { ExamVerdictCard } from "../../../../features/dojo/ExamVerdictCard";
import {
  examRankOf,
  puzzleExamProblemOf,
} from "../../../../features/dojo/exam-run";
import {
  AttemptHistoryPanel,
  AttemptStatusBadge,
} from "../../../../features/puzzle/components/AttemptHistoryPanel";
import { SolutionReplay } from "../../../../features/puzzle/components/SolutionReplay";
import {
  buildCells,
  buildRows,
  computeAttemptStatus,
  groupAttemptsByPlayerStep,
} from "../../../../features/puzzle/lib/attempt-history";
import { savePuzzleResult } from "../../../../features/puzzle/puzzles-api";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { fontSize, fontWeight, spacing, useTheme } from "../../../../theme";

function parseJson<T>(value: string | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * A puzzle's result (the web's `/practice/puzzle/[id]/result`): the
 * solution replayed on the board, then — when the player tried anything —
 * the attempt history with the solved / partly solved / revealed badge,
 * the board peek count, and whether a solved puzzle was recorded (a
 * signed-in player's free-play EXP, sent once). "Try Again" goes back to
 * the puzzle's page, as on the web; "Back to Puzzles" to the list. The
 * web's like, author, next puzzles, sign-up banner and Lichess analysis are
 * not ported.
 *
 * A dojo exam run (`exam` param) leads with the verdict on the player's
 * moves (`ExamVerdictCard`), earns no free-play EXP (the exam records its
 * own pass), and has one way out, back to the exam.
 */
export default function PuzzleResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const { width } = useWindowDimensions();
  const auth = useAuth();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    fen: string;
    status: string;
    attempts: string;
    solution: string;
    peekCount: string;
    playerMoveCount: string;
    exam?: string;
    moves?: string;
  }>();
  const exam = examRankOf(params.exam);
  const examProblem = puzzleExamProblemOf(params.exam);
  const examMoves = useMemo(
    () =>
      parseJson<unknown[]>(params.moves, []).filter(
        (move): move is string => typeof move === "string",
      ),
    [params.moves],
  );
  const { close } = useCloseSession(
    exam ? (`/dojo/exams/${exam}` as Href) : "/practice/puzzle",
  );
  const attempts = useMemo(
    () => parseJson<Attempt[]>(params.attempts, []),
    [params.attempts],
  );
  const solution = useMemo(
    () => parseJson<PuzzleSolutionMove[]>(params.solution, []),
    [params.solution],
  );
  const fen = params.fen ?? "";
  const solved = params.status === "solved";
  const peekCount = Number(params.peekCount) || 0;
  const [recorded, setRecorded] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (exam || !solved || sent.current || auth.status !== "signedIn") return;
    sent.current = true;
    void savePuzzleResult({
      playerMoveCount: Number(params.playerMoveCount) || 0,
      incorrectAttempts: attempts.filter((a) => !a.isCorrect).length,
      peekCount,
    }).then(setRecorded);
  }, [exam, solved, auth.status, params.playerMoveCount, attempts, peekCount]);

  const history = useMemo(() => {
    if (!fen || attempts.length === 0) return null;
    const sans = solution.map((m) => m.san);
    const cells = buildCells(
      sans,
      groupAttemptsByPlayerStep(attempts),
      solution.map((m) => m.note),
    );
    return {
      rows: buildRows(
        cells,
        isBlackToMoveFromFen(fen),
        fullmoveNumberFromFen(fen),
      ),
      status: computeAttemptStatus(attempts, sans),
    };
  }, [fen, attempts, solution]);

  const backToList = () => {
    // The list sits two screens down (list → puzzle → this modal); a result
    // opened any other way has no list under it, so close to the fallback.
    if (router.canDismiss()) {
      router.dismissTo("/practice/puzzle");
    } else {
      close();
    }
  };

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        {exam && examProblem && (
          <ExamVerdictCard
            exam={exam}
            kind="puzzle"
            problem={examProblem}
            answer={{ moves: examMoves }}
          />
        )}
        {fen ? (
          <ListSection title={t("puzzle.result.replaySection")}>
            <View style={styles.replay}>
              <SolutionReplay
                fen={fen}
                solution={solution}
                showMoveList={attempts.length === 0}
                maxSize={width - REPLAY_INSET}
              />
            </View>
          </ListSection>
        ) : null}

        {history && (
          <View style={styles.history}>
            <Text
              style={[styles.sectionTitle, { color: colors.mutedForeground }]}
            >
              {t("puzzle.result.historySection")}
            </Text>
            <AttemptHistoryPanel rows={history.rows} />
            <AttemptStatusBadge status={history.status} />
          </View>
        )}

        {peekCount > 0 && (
          <View style={styles.peeks}>
            <Ionicons name="eye" size={16} color={colors.mutedForeground} />
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {t("puzzle.result.peekCount", { count: peekCount })}
            </Text>
          </View>
        )}

        {recorded && (
          <Text style={[styles.meta, { color: feedbackColors.success }]}>
            {t("puzzle.recorded")}
          </Text>
        )}
      </ScrollView>
      <BottomBar style={styles.footer}>
        <Button
          title={t("puzzle.result.tryAgain")}
          size="lg"
          fullWidth
          testID="puzzle-try-again"
          onPress={close}
        />
        {!exam && (
          <Button
            title={t("puzzle.result.backToList")}
            variant="secondary"
            size="lg"
            fullWidth
            testID="puzzle-back-to-list"
            onPress={backToList}
          />
        )}
      </BottomBar>
    </Screen>
  );
}

/** The page's and the section card's padding on both sides. */
const REPLAY_INSET = spacing.md * 4;

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  replay: {
    padding: spacing.md,
  },
  history: {
    gap: spacing.sm,
  },
  // Captioned like a `ListSection`, without its card: the panel is its own.
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.md,
  },
  peeks: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  meta: {
    fontSize: fontSize.sm,
  },
  footer: {
    gap: 12,
  },
});
