import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import {
  fullmoveNumberFromFen,
  getTurnFromFen,
  isBlackToMoveFromFen,
  replayMoves,
} from "@blindfold-chess/features/chess-core";
import {
  buildSolutionPairs,
  type PuzzleSolutionMove,
} from "@blindfold-chess/features/puzzle";

import { ChessBoard } from "../../ai-game/components";
import {
  borderRadius,
  fontSize,
  fontWeight,
  monoFont,
  spacing,
  useTheme,
} from "../../../theme";
import { SideMarker } from "./AttemptHistoryPanel";

/** The web's replay pace: a beat before the first move, then one a second. */
const PLAY_INITIAL_DELAY_MS = 500;
const MOVE_INTERVAL_MS = 1000;

/**
 * The web's `PuzzleSolutionReplay`: the puzzle's position under a play
 * button that steps through the solution, then a "Replay" link under the
 * board. With `showMoveList` (a puzzle given up before any attempt) the
 * solution follows as text: "Solution: X" for a one-move puzzle, numbered
 * White / Black rows otherwise, with the author's notes.
 */
export function SolutionReplay({
  fen,
  solution,
  showMoveList,
  maxSize,
}: {
  fen: string;
  solution: readonly PuzzleSolutionMove[];
  showMoveList: boolean;
  maxSize?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const positions = useMemo(() => {
    try {
      return replayMoves(
        solution.map((m) => m.san),
        fen,
      );
    } catch {
      return [{ fen }];
    }
  }, [fen, solution]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (step >= positions.length - 1) {
      setPlaying(false);
      setPlayed(true);
      return;
    }
    const timer = setTimeout(
      () => setStep((s) => s + 1),
      step === 0 ? PLAY_INITIAL_DELAY_MS : MOVE_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [playing, step, positions.length]);

  const play = () => {
    setStep(0);
    setPlaying(true);
  };
  const position = positions[step] ?? positions[0];

  return (
    <View style={styles.container}>
      <View style={styles.boardWrap}>
        <ChessBoard
          fen={position.fen}
          flipped={isBlackToMoveFromFen(fen)}
          lastMove={position.lastMove ?? null}
          maxSize={maxSize}
        />
        {!playing && !played && positions.length > 1 && (
          <View style={styles.overlay}>
            <Pressable
              onPress={play}
              accessibilityRole="button"
              accessibilityLabel={t("puzzle.play")}
              testID="puzzle-replay-play"
              style={({ pressed }) => [
                styles.playButton,
                pressed && { transform: [{ scale: 1.1 }] },
              ]}
            >
              <Ionicons
                name="play"
                size={48}
                color="#111111"
                style={styles.playIcon}
              />
            </Pressable>
          </View>
        )}
      </View>
      {played && !playing && (
        <Pressable
          onPress={play}
          accessibilityRole="button"
          hitSlop={8}
          testID="puzzle-replay-again"
          style={styles.replay}
        >
          <Ionicons name="refresh" size={12} color={colors.mutedForeground} />
          <Text style={[styles.replayText, { color: colors.mutedForeground }]}>
            {t("puzzle.replay")}
          </Text>
        </Pressable>
      )}
      {showMoveList && solution.length > 0 && (
        <SolutionMoves fen={fen} solution={solution} />
      )}
    </View>
  );
}

function SolutionMoves({
  fen,
  solution,
}: {
  fen: string;
  solution: readonly PuzzleSolutionMove[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const note = (move: PuzzleSolutionMove | null) =>
    move?.note ? (
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        {t("puzzle.result.note", { note: move.note })}
      </Text>
    ) : null;

  if (solution.length === 1) {
    return (
      <Text style={[styles.single, { color: colors.foreground }]}>
        {t("puzzle.result.solution", { move: solution[0].san })}
        {solution[0].note ? (
          <Text style={{ color: colors.mutedForeground }}>
            {" "}
            {t("puzzle.result.note", { note: solution[0].note })}
          </Text>
        ) : null}
      </Text>
    );
  }

  const pairs = buildSolutionPairs(
    [...solution],
    getTurnFromFen(fen),
    fullmoveNumberFromFen(fen),
  );
  const cell = (move: PuzzleSolutionMove | null) => (
    <View style={styles.cell}>
      <Text
        style={[
          styles.mono,
          { color: move ? colors.foreground : colors.mutedForeground },
        ]}
      >
        {move?.san ?? "…"}
      </Text>
      {note(move)}
    </View>
  );

  return (
    <View style={[styles.table, { borderColor: colors.border }]}>
      <View style={styles.headRow}>
        <View style={styles.number} />
        <View style={styles.headCell}>
          <SideMarker black={false} />
          <Text style={[styles.head, { color: colors.mutedForeground }]}>
            {t("puzzle.white")}
          </Text>
        </View>
        <View style={styles.headCell}>
          <SideMarker black />
          <Text style={[styles.head, { color: colors.mutedForeground }]}>
            {t("puzzle.black")}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        {pairs.map((pair) => (
          <View key={pair.moveNumber} style={styles.row}>
            <Text
              style={[
                styles.number,
                styles.mono,
                { color: colors.mutedForeground },
              ]}
            >
              {pair.moveNumber}.
            </Text>
            {cell(pair.white)}
            {cell(pair.black)}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  boardWrap: {
    alignSelf: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: borderRadius.sm,
  },
  playButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: borderRadius.full,
    padding: spacing.lg,
  },
  // The triangle's optical centre sits left of its box.
  playIcon: {
    marginLeft: 4,
  },
  replay: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.xs,
    marginTop: -spacing.md,
  },
  replayText: {
    fontSize: fontSize.sm,
  },
  single: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
  table: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 12,
  },
  headCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  head: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  number: {
    width: 40,
    textAlign: "right",
    paddingRight: spacing.sm,
  },
  cell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  mono: {
    fontFamily: monoFont,
    fontSize: fontSize.sm,
    lineHeight: 22,
  },
  note: {
    fontSize: fontSize.xs,
  },
});
