import { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { coordinatesToSquare } from "@blindfold-chess/features/coordinate-quiz";
import type { ResolvedBoardOrientation } from "@blindfold-chess/types";

import { useGamePreferences } from "../../../lib/game-preferences";
import { borderRadius } from "../../../theme";
import type { Square } from "../lib/types";
import { ChessBoardSquare } from "./ChessBoardSquare";
import type { SquareHighlight } from "./ChessBoardSquare";

/**
 * The web board's `max-w-md`. A phone is narrower, so the board spans the
 * screen edge to edge with square corners, as the web's does below its `sm`
 * breakpoint; on a wider screen it stops here and rounds its corners.
 */
const MAX_BOARD_SIZE = 448;

type ChessBoardProps = {
  orientation: ResolvedBoardOrientation;
  highlights: Partial<Record<Square, SquareHighlight>>;
  onSquarePress: (square: Square) => void;
  disabled: boolean;
};

/** The coordinate-less 8×8 board, in the player's board theme. */
export function ChessBoard({
  orientation,
  highlights,
  onSquarePress,
  disabled,
}: ChessBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { preferences } = useGamePreferences();
  const boardSize = Math.min(screenWidth, MAX_BOARD_SIZE);
  const squareSize = boardSize / 8;
  const rounded = boardSize < screenWidth;

  const boardRows = useMemo(
    () =>
      Array.from({ length: 8 }, (_, rank) => (
        <View key={rank} style={styles.row}>
          {Array.from({ length: 8 }, (_, file) => {
            const square = coordinatesToSquare(file, rank, orientation);
            return (
              <ChessBoardSquare
                key={square}
                square={square}
                onPress={onSquarePress}
                highlight={highlights[square]}
                boardTheme={preferences.boardTheme}
                disabled={disabled}
                size={squareSize}
              />
            );
          })}
        </View>
      )),
    [
      orientation,
      highlights,
      preferences.boardTheme,
      disabled,
      squareSize,
      onSquarePress,
    ],
  );

  return (
    <View
      style={[
        styles.container,
        {
          width: boardSize,
          height: boardSize,
          borderRadius: rounded ? borderRadius.md : 0,
        },
      ]}
    >
      {boardRows}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
});
