import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core";
import {
  evaluatePuzzleSubmit,
  parseSolutionLines,
  type MoveSquares,
  type SessionState,
} from "@blindfold-chess/features/puzzle";

import { Button, ListSection, Screen, SwitchRow } from "../../../../components";
import {
  ButtonInput,
  ChessBoard,
} from "../../../../features/ai-game/components";
import {
  fetchPuzzle,
  type Puzzle,
} from "../../../../features/puzzle/puzzles-api";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { SessionTopBar } from "../../../../navigation/SessionTopBar";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../../../theme";

/**
 * Solving one puzzle (the web's `/practice/puzzle/[id]/session`): enter the
 * player's moves with the SAN keypad; a right move plays the opponent's
 * reply from the solution, a wrong one is counted. The board stays hidden
 * unless the player opens it, and each opening counts as a peek, as on the
 * web. Grading is the web's (`evaluatePuzzleSubmit`): any of the puzzle's
 * alternative solution lines is accepted until one is chosen.
 */
export default function PuzzleSession() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [puzzle, setPuzzle] = useState<Puzzle | "notFound" | "failed" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchPuzzle(id ?? "").then((result) => {
      if (!cancelled) setPuzzle(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (puzzle === null || typeof puzzle === "string") {
    return (
      <Screen>
        <SessionTopBar confirm={false} />
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
  return <PuzzleSolver puzzle={puzzle} />;
}

function PuzzleSolver({ puzzle }: { puzzle: Puzzle }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
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
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    null,
  );
  const [showBoard, setShowBoard] = useState(false);
  const [peekCount, setPeekCount] = useState(0);
  const finished = useRef(false);

  const goToResult = (
    status: "solved" | "revealed",
    attempts: SessionState["attempts"],
    lineIndex: number,
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
      },
    });
  };

  const handleSubmit = (san: string) => {
    const outcome = evaluatePuzzleSubmit(
      session,
      san,
      parsed,
      puzzle.solutions,
    );
    setSession(outcome.nextSession);
    const correct = outcome.kind === "accepted";
    answerHaptics(correct);
    setFeedback(correct ? "correct" : "incorrect");
    if (outcome.kind === "accepted") {
      setLastMove(outcome.opponentReply ?? outcome.playerMove);
      if (outcome.solve) {
        goToResult(
          "solved",
          outcome.nextSession.attempts,
          outcome.nextSession.lockedSolutionIndex ?? 0,
        );
      }
    }
  };

  const opponentLine = session.lastOpponentMove
    ? t(
        playerIsBlack
          ? "puzzle.session.whitePlayed"
          : "puzzle.session.blackPlayed",
        {
          move: session.lastOpponentMove,
        },
      )
    : null;

  return (
    <Screen>
      <SessionTopBar confirm={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {puzzle.title}
          </Text>
          {puzzle.description ? (
            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
            >
              {puzzle.description}
            </Text>
          ) : null}
          <Text style={[styles.prompt, { color: colors.foreground }]}>
            {playerIsBlack ? t("puzzle.blackToMove") : t("puzzle.whiteToMove")}
            {" · "}
            {t("puzzle.findMove")}
          </Text>
          {opponentLine && (
            <Text style={[styles.description, { color: colors.foreground }]}>
              {opponentLine}
            </Text>
          )}
          {feedback && (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.feedback,
                {
                  color:
                    feedback === "correct"
                      ? feedbackColors.success
                      : feedbackColors.error,
                },
              ]}
            >
              {feedback === "correct"
                ? t("puzzle.session.correctMove")
                : t("puzzle.session.incorrect")}
            </Text>
          )}
        </View>

        <ListSection>
          <SwitchRow
            label={t("puzzle.session.showBoard")}
            value={showBoard}
            onChange={(open) => {
              if (open) setPeekCount((n) => n + 1);
              setShowBoard(open);
            }}
          />
        </ListSection>
        {showBoard && (
          <ChessBoard
            fen={session.currentFen}
            flipped={playerIsBlack}
            lastMove={lastMove}
          />
        )}

        <ButtonInput fen={session.currentFen} onSubmit={handleSubmit} />

        <Button
          title={t("puzzle.session.showAnswer")}
          variant="outline"
          fullWidth
          onPress={() =>
            goToResult(
              "revealed",
              session.attempts,
              session.lockedSolutionIndex ?? 0,
            )
          }
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  header: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  prompt: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  feedback: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
