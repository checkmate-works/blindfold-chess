import { memo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";

import {
  type QuadrantId,
  type VisualQuadrant,
  quadrantIdAtVisualPosition,
} from "@blindfold-chess/features/quadrants";
import type { ResolvedBoardOrientation } from "@blindfold-chess/types";

import { useTheme, spacing } from "../../../theme";

type QuadrantBoardProps = {
  orientation: ResolvedBoardOrientation;
  /** The quadrant that held the square, while feedback shows. */
  correctQuadrant: QuadrantId | null;
  /** The quadrant the player wrongly picked, while feedback shows. */
  wrongQuadrant: QuadrantId | null;
  onQuadrantPress: (quadrant: QuadrantId) => void;
  disabled: boolean;
};

const ROWS: [VisualQuadrant, VisualQuadrant][] = [
  ["top-left", "top-right"],
  ["bottom-left", "bottom-right"],
];

/** Squares along one side of a quadrant. */
const QUADRANT_SQUARES = 4;

/**
 * An unlabelled board split into four tappable quarters.
 *
 * Each quarter is one touch target rather than sixteen squares: the answer is
 * the quarter, so tapping anywhere inside it counts, and the board is drawn
 * only so the player sees the quarters in board context. The square colours
 * do not depend on the orientation — both a8 (white's top-left) and h1
 * (black's top-left) are light.
 */
export function QuadrantBoard({
  orientation,
  correctQuadrant,
  wrongQuadrant,
  onQuadrantPress,
  disabled,
}: QuadrantBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();

  const boardSize = Math.min(screenWidth - spacing.lg * 2, 400);
  const quadrantSize = boardSize / 2;

  return (
    <View
      style={[
        styles.board,
        { width: boardSize, height: boardSize, borderColor: colors.foreground },
      ]}
    >
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((position, colIndex) => {
            const id = quadrantIdAtVisualPosition(position, orientation);
            return (
              <Quadrant
                key={position}
                id={id}
                size={quadrantSize}
                // Offsets of the quarter's first square on the full board, so
                // the light/dark pattern continues across quarter borders.
                rowOffset={rowIndex * QUADRANT_SQUARES}
                colOffset={colIndex * QUADRANT_SQUARES}
                feedback={
                  id === correctQuadrant
                    ? "correct"
                    : id === wrongQuadrant
                      ? "incorrect"
                      : null
                }
                onPress={onQuadrantPress}
                disabled={disabled}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

type QuadrantProps = {
  id: QuadrantId;
  size: number;
  rowOffset: number;
  colOffset: number;
  feedback: "correct" | "incorrect" | null;
  onPress: (id: QuadrantId) => void;
  disabled: boolean;
};

const Quadrant = memo(function Quadrant({
  id,
  size,
  rowOffset,
  colOffset,
  feedback,
  onPress,
  disabled,
}: QuadrantProps) {
  const { chessColors, feedbackColors } = useTheme();
  const squareSize = size / QUADRANT_SQUARES;

  const rows = [];
  for (let r = 0; r < QUADRANT_SQUARES; r++) {
    const squares = [];
    for (let c = 0; c < QUADRANT_SQUARES; c++) {
      const isLight = (rowOffset + r + colOffset + c) % 2 === 0;
      squares.push(
        <View
          key={c}
          style={{
            width: squareSize,
            height: squareSize,
            backgroundColor: isLight
              ? chessColors.boardLight
              : chessColors.boardDark,
          }}
        />,
      );
    }
    rows.push(
      <View key={r} style={styles.row}>
        {squares}
      </View>,
    );
  }

  const feedbackColor =
    feedback === "correct"
      ? feedbackColors.success
      : feedback === "incorrect"
        ? feedbackColors.error
        : null;

  return (
    <TouchableOpacity
      onPress={() => onPress(id)}
      disabled={disabled}
      activeOpacity={0.7}
      style={{ width: size, height: size }}
    >
      {rows}
      <View
        pointerEvents="none"
        style={[
          styles.frame,
          feedbackColor
            ? {
                borderColor: feedbackColor,
                backgroundColor: `${feedbackColor}4D`,
              }
            : { borderColor: chessColors.boardHighlight },
        ]}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  board: {
    alignSelf: "center",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 2,
  },
  row: {
    flexDirection: "row",
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
  },
});
