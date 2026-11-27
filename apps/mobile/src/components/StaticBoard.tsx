import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { isLightSquare } from "@blindfold-chess/features/common";
import type { Square } from "@blindfold-chess/types";
import { DISPLAY_RANKS, FILES } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { useGamePreferences } from "../lib/game-preferences";
import { fontWeight } from "../theme";

/**
 * The web's `rounded-md`. Exported for a scrim laid over the board from
 * outside its frame, which the board's own clipping does not reach.
 */
export const STATIC_BOARD_RADIUS = 6;

const REVERSED_RANKS = [...DISPLAY_RANKS].reverse();
const REVERSED_FILES = [...FILES].reverse();

type StaticBoardProps = {
  /** The widest the board gets, in points. */
  maxSize: number;
  /**
   * Where the available width comes from. Given, the board is the screen's
   * width less this much, so its size is known on the first frame. Left
   * out, the board fills its container, which it can only know after the
   * first layout, so the squares are drawn from the second frame on.
   */
  horizontalInset?: number;
  /**
   * The point size of the rank and file letters. Boards differ here (the
   * web's diagonal board uses 10, its route board 9), and a board that
   * ported one of them keeps its size.
   */
  coordinateFontSize?: number;
  /** A colour laid over the whole square, between its theme colour and its content. */
  squareTint?: (square: Square) => string | null | undefined;
  /**
   * What stands on the square: a piece, a number, a word. It is laid out
   * centred in the square and drawn under the coordinate letters, so a
   * label in the corner stays legible over it.
   */
  renderSquare?: (square: Square, squareSize: number) => ReactNode;
  /**
   * Turns the board to Black's side: rank 1 at the top and the h-file on
   * the left, the letters still down the left edge and along the bottom.
   * Defaults to White's side.
   */
  flipped?: boolean;
  /**
   * Draws the rank and file letters. Defaults to true: a board that
   * explains an answer needs them, since the coordinates are part of the
   * explanation, whatever the player's show-coordinates preference. A board
   * the player answers on passes that preference instead, as the web's do.
   */
  showCoordinates?: boolean;
  /**
   * Drawn over the squares and the letters, inside the board's rounded,
   * clipped frame, given the board's size in points: lines and touch
   * targets that span more than one square. Anything here that takes a tap
   * belongs to the module; the squares themselves still take none.
   */
  renderOverlay?: (boardSize: number) => ReactNode;
  testID?: string;
};

/**
 * A board in the player's board theme, with the rank letters down the left
 * edge and the file letters along the bottom, as the web's practice boards
 * draw them. The module decides what each square shows through
 * `squareTint` and `renderSquare`; the board owns the squares, the letters,
 * the rounded corners and the size, so every board built on it stays the
 * same board.
 *
 * The squares take no tap. A board the player answers square by square
 * (coordinate quiz, FEN recreation, knight's tour) is a grid of touch
 * targets with its own feedback and is not this component. A board answered
 * by region (quadrants' quarters) lays its own targets over the squares
 * with `renderOverlay`.
 */
export function StaticBoard({
  maxSize,
  horizontalInset,
  coordinateFontSize = 10,
  squareTint,
  renderSquare,
  flipped = false,
  showCoordinates = true,
  renderOverlay,
  testID,
}: StaticBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { preferences } = useGamePreferences();
  const theme = boardThemeColors[preferences.boardTheme];
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const fixedSize =
    horizontalInset === undefined
      ? null
      : Math.min(screenWidth - horizontalInset, maxSize);
  const boardSize = fixedSize ?? measuredWidth;
  const squareSize = boardSize / 8;
  const labelStyle = { fontSize: coordinateFontSize };
  const ranks = flipped ? REVERSED_RANKS : DISPLAY_RANKS;
  const files = flipped ? REVERSED_FILES : FILES;

  return (
    <View
      style={[
        styles.board,
        fixedSize === null
          ? [styles.fill, { maxWidth: maxSize }]
          : { width: fixedSize, height: fixedSize },
      ]}
      onLayout={
        fixedSize === null
          ? (event) => setMeasuredWidth(event.nativeEvent.layout.width)
          : undefined
      }
      testID={testID}
    >
      {boardSize > 0 &&
        ranks.map((rank, row) => (
          <View key={rank} style={styles.row}>
            {files.map((file, col) => {
              const square: Square = `${file}${rank}`;
              const light = isLightSquare(col, row);
              const tint = squareTint?.(square);
              const labelColor = light ? theme.lightText : theme.darkText;
              return (
                <View
                  key={square}
                  style={[
                    styles.square,
                    {
                      width: squareSize,
                      height: squareSize,
                      backgroundColor: light ? theme.light : theme.dark,
                    },
                  ]}
                >
                  {tint && (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: tint },
                      ]}
                    />
                  )}
                  {renderSquare?.(square, squareSize)}
                  {showCoordinates && col === 0 && (
                    <Text
                      style={[
                        styles.rankLabel,
                        labelStyle,
                        { color: labelColor },
                      ]}
                    >
                      {rank}
                    </Text>
                  )}
                  {showCoordinates && row === ranks.length - 1 && (
                    <Text
                      style={[
                        styles.fileLabel,
                        labelStyle,
                        { color: labelColor },
                      ]}
                    >
                      {file}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      {boardSize > 0 && renderOverlay?.(boardSize)}
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `rounded-md overflow-hidden`.
  board: {
    alignSelf: "center",
    borderRadius: STATIC_BOARD_RADIUS,
    overflow: "hidden",
  },
  fill: {
    width: "100%",
    aspectRatio: 1,
  },
  row: {
    flexDirection: "row",
  },
  square: {
    alignItems: "center",
    justifyContent: "center",
  },
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontWeight: fontWeight.semibold,
  },
  fileLabel: {
    position: "absolute",
    bottom: 0,
    right: 2,
    fontWeight: fontWeight.semibold,
  },
});
