import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType, Square } from "@blindfold-chess/types";

import { StaticBoard } from "../../../components";
import { spacing, useTheme, withAlpha } from "../../../theme";

/** The web's `max-w-sm`. */
const MAX_BOARD_SIZE = 384;
const EMPTY: readonly string[] = [];

/** The web's `bg-blue-500/30` and `bg-yellow-400/50`. */
const START_TINT = "rgba(59, 130, 246, 0.3)";
const HIGHLIGHT_TINT = "rgba(250, 204, 21, 0.5)";

/** The web route board's `text-[9px]` coordinates. */
const COORDINATE_FONT_SIZE = 9;

type RouteBoardProps = {
  start: string;
  target: string;
  piece: PieceType;
  /** The squares visited in order, the start first; each is numbered. */
  path: readonly string[];
  /** A square picked in a path strip that is not on `path`. */
  highlightedSquare?: string | null;
  /** Squares the piece could not have reached from the one before. */
  wrongSquares?: readonly string[];
  /** The screen width around the board; by default the screen's padding. */
  horizontalInset?: number;
};

/**
 * What one square of the route board shows, in the order the cases win:
 * the target is the goal even when the route reaches it, and the start
 * keeps its blue only until the route numbers it.
 */
type RouteSquareState =
  | { kind: "goal" }
  | { kind: "start" }
  | { kind: "step"; step: number; isLast: boolean; isWrong: boolean }
  | { kind: "highlighted" }
  | null;

/**
 * The web's `RoutePlannerBoard`: the route numbered square by square on a
 * board in the player's theme, from White's side with its coordinates. The
 * start is tinted blue until the route leaves it, the target is the green
 * "Goal", a square the piece could not have reached is tinted red, and the
 * piece stands on the last square of the route.
 */
export function RouteBoard({
  start,
  target,
  piece,
  path,
  highlightedSquare = null,
  wrongSquares = EMPTY,
  horizontalInset = spacing.lg * 2,
}: RouteBoardProps) {
  const { colors } = useTheme();

  const stateOf = useMemo(() => {
    const steps = new Map<string, number>();
    path.forEach((square, i) => steps.set(square, i + 1));
    const wrong = new Set(wrongSquares);
    return (square: Square): RouteSquareState => {
      const step = steps.get(square);
      if (square === target) return { kind: "goal" };
      if (square === start && step === undefined) return { kind: "start" };
      if (step !== undefined) {
        return {
          kind: "step",
          step,
          isLast: step === path.length,
          isWrong: wrong.has(square),
        };
      }
      if (square === highlightedSquare) return { kind: "highlighted" };
      return null;
    };
  }, [start, target, path, wrongSquares, highlightedSquare]);

  const squareTint = (square: Square): string | null => {
    const state = stateOf(square);
    switch (state?.kind) {
      case "goal":
        return colors.success;
      case "start":
        return START_TINT;
      case "step":
        return state.isWrong ? withAlpha(colors.destructive, 0.4) : null;
      case "highlighted":
        return HIGHLIGHT_TINT;
      default:
        return null;
    }
  };

  const renderSquare = (square: Square, squareSize: number) => {
    const state = stateOf(square);
    const badgeSize = squareSize * 0.45;
    switch (state?.kind) {
      case "goal":
        return (
          <Text style={[styles.goal, { color: colors.successForeground }]}>
            Goal
          </Text>
        );
      case "start":
        return <StepBadge number={1} size={badgeSize} />;
      case "step":
        return (
          <>
            {state.isLast && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.center,
                  styles.lastPiece,
                ]}
              >
                <ChessPieceIcon
                  type={piece}
                  color="w"
                  size={squareSize * 0.75}
                />
              </View>
            )}
            <StepBadge
              number={state.step}
              size={badgeSize}
              ringed={state.isLast}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <StaticBoard
      maxSize={MAX_BOARD_SIZE}
      horizontalInset={horizontalInset}
      coordinateFontSize={COORDINATE_FONT_SIZE}
      squareTint={squareTint}
      renderSquare={renderSquare}
    />
  );
}

/** The web's `bg-black/60 rounded-full` step number, ringed on the last step. */
function StepBadge({
  number,
  size,
  ringed = false,
}: {
  number: number;
  size: number;
  ringed?: boolean;
}) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2 },
        ringed && styles.badgeRing,
      ]}
    >
      <Text style={styles.badgeText}>{number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  lastPiece: {
    opacity: 0.8,
  },
  goal: {
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRing: {
    borderWidth: 2,
    borderColor: "#ffffff",
    transform: [{ scale: 1.1 }],
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
