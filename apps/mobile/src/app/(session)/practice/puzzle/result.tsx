import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  fullmoveNumberFromFen,
  getTurnFromFen,
} from "@blindfold-chess/features/chess-core";
import {
  buildSolutionPairs,
  type Attempt,
  type PuzzleSolutionMove,
} from "@blindfold-chess/features/puzzle";

import { Button, ListRow, ListSection, Screen } from "../../../../components";
import { useAuth } from "../../../../auth/use-auth";
import { savePuzzleResult } from "../../../../features/puzzle/puzzles-api";
import { useCloseSession } from "../../../../navigation/use-close-session";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../../../theme";

function parseJson<T>(value: string | undefined, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * A puzzle's result (the web's `/practice/puzzle/[id]/result`): solved or
 * revealed, the solution line with the author's notes, and every attempt.
 * A solved puzzle is recorded for a signed-in player (free-play EXP), once.
 */
export default function PuzzleResult() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const auth = useAuth();
  const { close } = useCloseSession("/practice/puzzle");
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    fen: string;
    status: string;
    attempts: string;
    solution: string;
    peekCount: string;
    playerMoveCount: string;
  }>();
  const attempts = useMemo(
    () => parseJson<Attempt[]>(params.attempts, []),
    [params.attempts],
  );
  const solution = parseJson<PuzzleSolutionMove[]>(params.solution, []);
  const solved = params.status === "solved";
  const peekCount = Number(params.peekCount) || 0;
  const [recorded, setRecorded] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    if (!solved || sent.current || auth.status !== "signedIn") return;
    sent.current = true;
    void savePuzzleResult({
      playerMoveCount: Number(params.playerMoveCount) || 0,
      incorrectAttempts: attempts.filter((a) => !a.isCorrect).length,
      peekCount,
    }).then(setRecorded);
  }, [solved, auth.status, params.playerMoveCount, attempts, peekCount]);

  const fen = params.fen ?? "";
  const pairs = fen
    ? buildSolutionPairs(
        solution,
        getTurnFromFen(fen),
        fullmoveNumberFromFen(fen),
      )
    : [];

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summary, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {params.title}
          </Text>
          <Text
            style={[
              styles.status,
              {
                color: solved ? feedbackColors.success : colors.mutedForeground,
              },
            ]}
          >
            {solved
              ? t("puzzle.result.statusSolved")
              : t("puzzle.result.statusRevealed")}
          </Text>
          <Text style={{ color: colors.mutedForeground }}>
            {t("puzzle.result.peekCount", { count: peekCount })}
          </Text>
          {recorded && (
            <Text style={{ color: feedbackColors.success }}>
              {t("puzzle.recorded")}
            </Text>
          )}
        </View>

        <ListSection title={t("puzzle.result.replaySection")}>
          {pairs.map((pair) => (
            <ListRow
              key={pair.moveNumber}
              title={`${pair.moveNumber}. ${pair.white?.san ?? "…"} ${pair.black?.san ?? ""}`}
              subtitle={
                [pair.white?.note, pair.black?.note]
                  .filter((note): note is string => Boolean(note))
                  .map((note) => t("puzzle.result.note", { note }))
                  .join("\n") || undefined
              }
            />
          ))}
        </ListSection>

        {attempts.length > 0 && (
          <ListSection title={t("puzzle.result.historySection")}>
            {attempts.map((attempt, i) => (
              <ListRow
                key={i}
                title={attempt.move}
                value={
                  attempt.isCorrect
                    ? t("puzzle.result.attemptCorrect")
                    : t("puzzle.result.attemptIncorrect")
                }
              />
            ))}
          </ListSection>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={t("puzzle.result.tryAgain")}
          size="lg"
          fullWidth
          onPress={() =>
            router.replace({
              pathname: "/practice/puzzle/session",
              params: { id: params.id },
            })
          }
        />
        <Button
          title={t("puzzle.result.backToList")}
          variant="ghost"
          fullWidth
          onPress={close}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  summary: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  status: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
