import { View, StyleSheet, useWindowDimensions } from "react-native";
import { ChessBoardSquare } from "./ChessBoardSquare";
import { coordinatesToSquare } from "../lib/utils";
import type { Square, AnswerFeedback } from "../lib/types";
import { useTheme, spacing } from "../../../theme";

type ChessBoardProps = {
  orientation: "white" | "black";
  targetSquare: Square | null;
  feedback: AnswerFeedback;
  onSquarePress: (square: Square) => void;
  disabled: boolean;
};

export function ChessBoard({
  orientation,
  targetSquare,
  feedback,
  onSquarePress,
  disabled,
}: ChessBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();

  // Calculate board size (max width minus padding)
  const maxBoardSize = screenWidth - spacing.lg * 2;
  const boardSize = Math.min(maxBoardSize, 400);
  const squareSize = boardSize / 8;

  // Generate board rows
  const renderBoard = () => {
    const rows = [];

    for (let rank = 0; rank < 8; rank++) {
      const squares = [];

      for (let file = 0; file < 8; file++) {
        const square = coordinatesToSquare(file, rank, orientation);
        const isTarget = targetSquare === square;

        squares.push(
          <ChessBoardSquare
            key={square}
            square={square}
            onPress={onSquarePress}
            isTarget={isTarget}
            feedback={feedback}
            disabled={disabled}
            size={squareSize}
          />,
        );
      }

      rows.push(
        <View key={rank} style={styles.row}>
          {squares}
        </View>,
      );
    }

    return rows;
  };

  return (
    <View
      style={[
        styles.container,
        { width: boardSize, height: boardSize, borderColor: colors.foreground },
      ]}
    >
      <View style={styles.board}>{renderBoard()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 2,
  },
  board: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
});
