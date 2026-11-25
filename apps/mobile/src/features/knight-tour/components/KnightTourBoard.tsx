import Ionicons from "@expo/vector-icons/Ionicons";
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
import { boardThemeColors } from "@blindfold-chess/ui";

import { useGamePreferences } from "../../../lib/game-preferences";
import { fontWeight, spacing, useTheme, withAlpha } from "../../../theme";

/** The web board's `max-w-md`. */
const MAX_BOARD_SIZE = 448;

type KnightTourBoardProps = {
  /** Where the knight is drawn; empty draws no knight. */
  currentSquare: string;
  /** Square → move number on which it was reached. */
  visitedSquares: ReadonlyMap<string, number>;
  /**
   * Squares that respond to taps. During play these are the legal next
   * squares; the starting-square picker passes every square.
   */
  tappableSquares: readonly string[];
  onSquarePress?: (square: string) => void;
  /** Number each visited square instead of crossing it out (result screen). */
  showMoveNumbers?: boolean;
  /**
   * Width taken off the screen's for the board's size: the padding of
   * everything around it. Defaults to the screen padding on both sides.
   */
  horizontalInset?: number;
};

/**
 * The Knight's Tour board, the web's `KnightTourBoard`: always from White's
 * side, in the player's board theme, with the coordinate letters when the
 * show-coordinates preference is on. The knight stands on the current
 * square, every visited square is crossed out (or numbered, on the result)
 * and only the legal next squares respond.
 *
 * Not a `StaticBoard`: it is a grid of touch targets, and it follows the
 * show-coordinates preference as the web's play board does, where a
 * picture board always draws the letters.
 */
export function KnightTourBoard({
  currentSquare,
  visitedSquares,
  tappableSquares,
  onSquarePress,
  showMoveNumbers = false,
  horizontalInset = spacing.lg * 2,
}: KnightTourBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
  const theme = boardThemeColors[preferences.boardTheme];
  const boardSize = Math.min(screenWidth - horizontalInset, MAX_BOARD_SIZE);
  const squareSize = boardSize / 8;
  const tappable = useMemo(() => new Set(tappableSquares), [tappableSquares]);
  const crossColor = withAlpha(colors.foreground, 0.5);

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {DISPLAY_RANKS.map((rank, row) => (
        <View key={rank} style={styles.row}>
          {FILES.map((file, col) => {
            const square = `${file}${rank}`;
            const light = (row + col) % 2 === 0;
            return (
              <BoardSquare
                key={square}
                square={square}
                size={squareSize}
                background={light ? theme.light : theme.dark}
                labelColor={light ? theme.lightText : theme.darkText}
                crossColor={crossColor}
                rankLabel={
                  preferences.showCoordinates && col === 0 ? rank : null
                }
                fileLabel={
                  preferences.showCoordinates &&
                  row === DISPLAY_RANKS.length - 1
                    ? file
                    : null
                }
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
  size: number;
  background: string;
  labelColor: string;
  crossColor: string;
  rankLabel: string | null;
  fileLabel: string | null;
  hasKnight: boolean;
  moveNumber: number | undefined;
  showMoveNumber: boolean;
  tappable: boolean;
  onPress?: (square: string) => void;
};

const BoardSquare = memo(function BoardSquare({
  square,
  size,
  background,
  labelColor,
  crossColor,
  rankLabel,
  fileLabel,
  hasKnight,
  moveNumber,
  showMoveNumber,
  tappable,
  onPress,
}: BoardSquareProps) {
  let content = null;
  if (hasKnight) {
    content = <ChessPieceIcon type="n" color="w" size={size * 0.8} />;
  } else if (moveNumber !== undefined) {
    content = showMoveNumber ? (
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{moveNumber}</Text>
      </View>
    ) : (
      <Ionicons name="close" size={size * 0.5} color={crossColor} />
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress?.(square)}
      disabled={!tappable}
      activeOpacity={0.7}
      accessibilityLabel={square}
      style={[
        styles.square,
        { width: size, height: size, backgroundColor: background },
      ]}
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
    </TouchableOpacity>
  );
});

/**
 * The web's `rounded-md` board, its `w-6 h-6 rounded-full bg-black/50`
 * move numbers in white `text-xs` bold, and its crosses at half the
 * foreground colour.
 */
const styles = StyleSheet.create({
  board: {
    alignSelf: "center",
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  square: {
    justifyContent: "center",
    alignItems: "center",
  },
  numberBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 2,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  fileLabel: {
    position: "absolute",
    bottom: 0,
    right: 2,
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
});
