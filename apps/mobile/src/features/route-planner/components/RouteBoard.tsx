import { memo, useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import { DISPLAY_RANKS, FILES, type PieceType } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { useGamePreferences } from "../../../lib/game-preferences";
import { spacing, useTheme, withAlpha } from "../../../theme";

/** The web's `max-w-sm`. */
const MAX_BOARD_SIZE = 384;
const EMPTY: readonly string[] = [];

/** The web's `bg-blue-500/30` and `bg-yellow-400/50`. */
const START_TINT = "rgba(59, 130, 246, 0.3)";
const HIGHLIGHT_TINT = "rgba(250, 204, 21, 0.5)";

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
  const { width } = useWindowDimensions();
  const { preferences } = useGamePreferences();
  const palette = boardThemeColors[preferences.boardTheme];
  const boardSize = Math.min(width - horizontalInset, MAX_BOARD_SIZE);
  const squareSize = boardSize / 8;

  const steps = useMemo(() => {
    const map = new Map<string, number>();
    path.forEach((square, i) => map.set(square, i + 1));
    return map;
  }, [path]);
  const wrong = useMemo(() => new Set(wrongSquares), [wrongSquares]);

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {DISPLAY_RANKS.map((rank, row) => (
        <View key={rank} style={styles.row}>
          {FILES.map((file, col) => {
            const square = `${file}${rank}`;
            const step = steps.get(square);
            return (
              <RouteSquare
                key={square}
                size={squareSize}
                light={(row + col) % 2 === 0}
                palette={palette}
                rankLabel={col === 0 ? rank : null}
                fileLabel={row === 7 ? file : null}
                isStart={square === start}
                isTarget={square === target}
                step={step}
                isLast={step !== undefined && step === path.length}
                isWrong={wrong.has(square)}
                isHighlighted={square === highlightedSquare}
                piece={piece}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

type RouteSquareProps = {
  size: number;
  light: boolean;
  palette: (typeof boardThemeColors)[keyof typeof boardThemeColors];
  rankLabel: string | null;
  fileLabel: string | null;
  isStart: boolean;
  isTarget: boolean;
  step: number | undefined;
  isLast: boolean;
  isWrong: boolean;
  isHighlighted: boolean;
  piece: PieceType;
};

const RouteSquare = memo(function RouteSquare({
  size,
  light,
  palette,
  rankLabel,
  fileLabel,
  isStart,
  isTarget,
  step,
  isLast,
  isWrong,
  isHighlighted,
  piece,
}: RouteSquareProps) {
  const { colors } = useTheme();
  const labelColor = light ? palette.lightText : palette.darkText;
  const badgeSize = size * 0.45;

  let content = null;
  if (isTarget) {
    content = (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.center,
          { backgroundColor: colors.success },
        ]}
      >
        <Text style={[styles.goal, { color: colors.successForeground }]}>
          Goal
        </Text>
      </View>
    );
  } else if (isStart && step === undefined) {
    content = (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.center,
          { backgroundColor: START_TINT },
        ]}
      >
        <StepBadge number={1} size={badgeSize} />
      </View>
    );
  } else if (step !== undefined) {
    content = (
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {isWrong && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha(colors.destructive, 0.4) },
            ]}
          />
        )}
        {isLast && (
          <View
            style={[StyleSheet.absoluteFill, styles.center, styles.lastPiece]}
          >
            <ChessPieceIcon type={piece} color="w" size={size * 0.75} />
          </View>
        )}
        <StepBadge number={step} size={badgeSize} ringed={isLast} />
      </View>
    );
  } else if (isHighlighted) {
    content = (
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: HIGHLIGHT_TINT }]}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: light ? palette.light : palette.dark,
      }}
    >
      {content}
      {rankLabel && (
        <Text style={[styles.rankLabel, { color: labelColor }]}>
          {rankLabel}
        </Text>
      )}
      {fileLabel && (
        <Text style={[styles.fileLabel, { color: labelColor }]}>
          {fileLabel}
        </Text>
      )}
    </View>
  );
});

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
  board: {
    alignSelf: "center",
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
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
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: 9,
    fontWeight: "600",
  },
  fileLabel: {
    position: "absolute",
    bottom: 0,
    right: 2,
    fontSize: 9,
    fontWeight: "600",
  },
});
