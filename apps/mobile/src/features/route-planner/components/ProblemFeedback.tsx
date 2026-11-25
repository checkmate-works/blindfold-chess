import Ionicons from "@expo/vector-icons/Ionicons";
import { Fragment, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  getPossibleMoves,
  type RoutePlannerPieceType,
} from "@blindfold-chess/features/route-planner";
import type { Square } from "@blindfold-chess/types";

import {
  fontSize,
  fontWeight,
  useTheme,
  monoFont,
  withAlpha,
} from "../../../theme";
import { RouteBoard } from "./RouteBoard";

/** Which strip drives the board, and the square picked in it. */
type Scrub = { source: "yours" | "shortest"; index: number };

type ProblemFeedbackProps = {
  piece: RoutePlannerPieceType;
  start: Square;
  end: Square;
  /** The player's route from the start, the start itself left out. */
  moves: readonly Square[];
  /** The shortest route, both ends included. */
  shortestPath: readonly Square[];
  success: boolean;
  /** Skipped or timed out: there is no route of the player's to show. */
  skipped?: boolean;
  /** The screen width around the board (`RouteBoard`'s `horizontalInset`). */
  boardInset?: number;
};

/**
 * The web's `RoutePlannerProblemFeedback`: the player's route in a green or
 * red strip, the board drawing it, and the shortest route under it unless
 * the player found one as short. Tapping a square in either strip replays
 * that route on the board up to the square; tapping it again goes back to
 * the player's own route (the shortest one, for a skipped problem).
 */
export function ProblemFeedback({
  piece,
  start,
  end,
  moves,
  shortestPath,
  success,
  skipped = false,
  boardInset,
}: ProblemFeedbackProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const [locked, setLocked] = useState<Scrub | null>(null);

  const userPath = useMemo(() => [start, ...moves], [start, moves]);
  // An equally short route through other squares is not "wrong", so the
  // shortest one is shown only when there is something to learn from it.
  const showShortest = !(success && userPath.length === shortestPath.length);

  const wrongSquares = useMemo(() => {
    if (skipped) return [];
    const bad: string[] = [];
    let prev = start;
    for (const move of moves) {
      if (!getPossibleMoves(piece, prev).includes(move)) bad.push(move);
      prev = move;
    }
    return bad;
  }, [skipped, start, piece, moves]);

  const activePath = locked?.source === "shortest" ? shortestPath : userPath;
  const boardPath = locked
    ? activePath.slice(0, locked.index + 1)
    : skipped
      ? shortestPath
      : userPath;
  const highlightedSquare = locked ? activePath[locked.index] : null;
  // The red marks belong to the player's route only.
  const boardWrongSquares = (locked ? locked.source === "yours" : !skipped)
    ? wrongSquares
    : [];

  const toggle = (source: Scrub["source"]) => (index: number) =>
    setLocked((prev) =>
      prev?.source === source && prev.index === index
        ? null
        : { source, index },
    );

  return (
    <View style={styles.container}>
      {!skipped && (
        <View
          style={[
            styles.strip,
            success
              ? {
                  borderColor: colors.success,
                  backgroundColor: feedbackColors.successSoft,
                }
              : {
                  borderColor: colors.destructive,
                  backgroundColor: feedbackColors.errorSoft,
                },
          ]}
          testID="route-feedback-yours"
        >
          <PathChips
            path={userPath}
            highlightedIndex={locked?.source === "yours" ? locked.index : null}
            onPress={toggle("yours")}
          />
        </View>
      )}

      <RouteBoard
        start={start}
        target={end}
        piece={piece}
        path={boardPath}
        highlightedSquare={highlightedSquare}
        wrongSquares={boardWrongSquares}
        horizontalInset={boardInset}
      />

      {showShortest && (
        <View
          style={[
            styles.strip,
            {
              borderColor: "transparent",
              backgroundColor: withAlpha(colors.muted, 0.3),
            },
          ]}
          testID="route-feedback-shortest"
        >
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            {t("routePlanner.session.shortestPath")} ·{" "}
            {t("routePlanner.session.distance", {
              count: Math.max(shortestPath.length - 1, 0),
            })}
          </Text>
          <PathChips
            path={shortestPath}
            highlightedIndex={
              locked?.source === "shortest" ? locked.index : null
            }
            onPress={toggle("shortest")}
          />
        </View>
      )}
    </View>
  );
}

/**
 * A route as tappable squares, the ends larger and bold. Every square is
 * tappable, the goal too: it puts the whole route on the board at once.
 */
function PathChips({
  path,
  highlightedIndex,
  onPress,
}: {
  path: readonly string[];
  highlightedIndex: number | null;
  onPress: (index: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips}>
      {path.map((square, i) => {
        const isEndpoint = i === 0 || i === path.length - 1;
        const selected = highlightedIndex === i;
        return (
          <Fragment key={i}>
            {i > 0 && (
              <Ionicons
                name="arrow-forward"
                size={10}
                color={withAlpha(colors.mutedForeground, 0.5)}
              />
            )}
            <Pressable
              onPress={() => onPress(i)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              hitSlop={4}
              style={[
                styles.chip,
                selected
                  ? {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    }
                  : {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
              ]}
            >
              <Text
                style={[
                  isEndpoint ? styles.endpoint : styles.step,
                  {
                    color: selected
                      ? colors.primaryForeground
                      : colors.foreground,
                  },
                ]}
              >
                {square}
              </Text>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

/**
 * The web's `space-y-4`, the strips' `p-4 rounded-lg border`, the caption's
 * `text-xs font-medium mb-2`, and the chips' `px-2 py-1 rounded` with
 * `text-sm font-bold` ends and `text-xs` steps between them.
 */
const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  strip: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  endpoint: {
    fontFamily: monoFont,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  step: {
    fontFamily: monoFont,
    fontSize: fontSize.xs,
  },
});
