import { memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { DISPLAY_RANKS, FILES } from "@blindfold-chess/types";
import { ChessPieceIcon } from "@blindfold-chess/icons";

import { chessColors, spacing, useTheme } from "../../../theme";

type KnightTourBoardProps = {
  /** Where the knight is drawn; empty draws no knight. */
  currentSquare: string;
  /** Square → move number on which it was reached. */
  visitedSquares: ReadonlyMap<string, number>;
  /**
   * Squares that respond to taps. During play these are the legal next
   * squares; the setup screen passes every square so any can be picked.
   */
  tappableSquares: readonly string[];
  onSquarePress?: (square: string) => void;
  /** Number each visited square instead of crossing it out (result screen). */
  showMoveNumbers?: boolean;
};

/**
 * The Knight's Tour board, always from White's side like the web version.
 *
 * Unlike the coordinate-quiz board (one target square, feedback colours) and
 * the ai-game board (pieces from a FEN), this one marks every visited square
 * and only lets the legal next squares respond, so it is its own component.
 */
export function KnightTourBoard({
  currentSquare,
  visitedSquares,
  tappableSquares,
  onSquarePress,
  showMoveNumbers = false,
}: KnightTourBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const boardSize = Math.min(screenWidth - spacing.lg * 2, 400);
  const squareSize = boardSize / 8;
  const tappable = useMemo(() => new Set(tappableSquares), [tappableSquares]);

  return (
    <View
      style={[
        styles.container,
        { width: boardSize, height: boardSize, borderColor: colors.foreground },
      ]}
    >
      {DISPLAY_RANKS.map((rank, rankIndex) => (
        <View key={rank} style={styles.row}>
          {FILES.map((file, fileIndex) => {
            const square = `${file}${rank}`;
            return (
              <BoardSquare
                key={square}
                square={square}
                light={(rankIndex + fileIndex) % 2 === 0}
                size={squareSize}
                hasKnight={square === currentSquare}
                moveNumber={visitedSquares.get(square)}
                showMoveNumber={showMoveNumbers}
                tappable={tappable.has(square) && onSquarePress !== undefined}
                onPress={onSquarePress}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

type BoardSquareProps = {
  square: string;
  light: boolean;
  size: number;
  hasKnight: boolean;
  moveNumber: number | undefined;
  showMoveNumber: boolean;
  tappable: boolean;
  onPress?: (square: string) => void;
};

const BoardSquare = memo(function BoardSquare({
  square,
  light,
  size,
  hasKnight,
  moveNumber,
  showMoveNumber,
  tappable,
  onPress,
}: BoardSquareProps) {
  const markColor = light ? chessColors.boardDark : chessColors.boardLight;

  let content = null;
  if (hasKnight) {
    content = <ChessPieceIcon type="n" color="w" size={size * 0.8} />;
  } else if (moveNumber !== undefined) {
    content = showMoveNumber ? (
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{moveNumber}</Text>
      </View>
    ) : (
      <Text style={[styles.cross, { color: markColor }]}>{"✕"}</Text>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress?.(square)}
      disabled={!tappable}
      activeOpacity={0.7}
      style={[
        styles.square,
        {
          width: size,
          height: size,
          backgroundColor: light
            ? chessColors.boardLight
            : chessColors.boardDark,
        },
      ]}
    >
      {content}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 2,
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
  square: {
    justifyContent: "center",
    alignItems: "center",
  },
  cross: {
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.7,
  },
  numberBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 3,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
