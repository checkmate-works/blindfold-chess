import { memo, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { fenToBoardFlat } from "@blindfold-chess/features/chess-core/fen";
import { DISPLAY_RANKS, FILES } from "@blindfold-chess/types";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceColor, PieceType } from "@blindfold-chess/icons";
import { boardThemeColors } from "@blindfold-chess/ui";

import { useGamePreferences } from "../../../lib/game-preferences";
import { spacing, fontSize } from "../../../theme";

type FenBoardProps = {
  fen: string;
  flipped?: boolean;
  /** Tapping a square calls this; omitted, the board is read-only. */
  onSquarePress?: (square: string) => void;
  /** Largest edge in points; the board also never exceeds the screen width. */
  maxSize?: number;
  /**
   * Width taken off the screen width before sizing, for a board inside a
   * padded panel. Defaults to the screen's own 24pt padding on both sides.
   */
  horizontalInset?: number;
  /**
   * A colour laid over a square (the result's correct / wrong / missing
   * marks), by square name. Undefined leaves the square plain.
   */
  squareTint?: (square: string) => string | undefined;
  /**
   * Draws the coordinate letters regardless of the player's preference;
   * false hides them (the result's small side-by-side boards, as the web's).
   */
  showCoordinates?: boolean;
};

/**
 * A board drawn from a FEN that can take taps on any square — the FEN
 * drill's recreation board, and (without `onSquarePress`) its preview and
 * comparison boards.
 *
 * The AI-game `ChessBoard` is read-only and applies the blindfold piece
 * rules, and the knight-tour board draws one knight; neither places
 * arbitrary pieces, so this is its own component. Theme and coordinates
 * come from the player's global board preferences like the other boards.
 */
export function FenBoard({
  fen,
  flipped = false,
  onSquarePress,
  maxSize = 400,
  horizontalInset = spacing.lg * 2,
  squareTint,
  showCoordinates,
}: FenBoardProps) {
  const { preferences } = useGamePreferences();
  const { width: screenWidth } = useWindowDimensions();
  const boardSize = Math.min(screenWidth - horizontalInset, maxSize);
  const coordinates = showCoordinates ?? preferences.showCoordinates;
  const squareSize = boardSize / 8;
  const theme = boardThemeColors[preferences.boardTheme];

  // a8-first, rank by rank — the order DISPLAY_RANKS × FILES walks.
  const pieces = useMemo(() => fenToBoardFlat(fen), [fen]);
  const ranks = flipped ? [...DISPLAY_RANKS].reverse() : DISPLAY_RANKS;
  const files = flipped ? [...FILES].reverse() : FILES;

  return (
    <View style={[styles.container, { width: boardSize, height: boardSize }]}>
      {ranks.map((rank, rowIndex) => (
        <View key={rank} style={styles.row}>
          {files.map((file, colIndex) => {
            const square = `${file}${rank}`;
            const index = (8 - Number(rank)) * 8 + FILES.indexOf(file);
            const light = (Number(rank) + FILES.indexOf(file)) % 2 === 0;
            return (
              <BoardSquare
                key={square}
                square={square}
                piece={pieces[index] ?? ""}
                size={squareSize}
                background={light ? theme.light : theme.dark}
                labelColor={light ? theme.lightText : theme.darkText}
                tint={squareTint?.(square)}
                rankLabel={coordinates && colIndex === 0 ? String(rank) : null}
                fileLabel={coordinates && rowIndex === 7 ? file : null}
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
  /** FEN piece letter, or "" for an empty square. */
  piece: string;
  size: number;
  background: string;
  labelColor: string;
  tint?: string;
  rankLabel: string | null;
  fileLabel: string | null;
  onPress?: (square: string) => void;
};

const BoardSquare = memo(function BoardSquare({
  square,
  piece,
  size,
  background,
  labelColor,
  tint,
  rankLabel,
  fileLabel,
  onPress,
}: BoardSquareProps) {
  const lower = piece.toLowerCase();
  return (
    <TouchableOpacity
      onPress={() => onPress?.(square)}
      disabled={!onPress}
      activeOpacity={0.6}
      accessibilityLabel={piece ? `${square} ${piece}` : square}
      style={[
        styles.square,
        { width: size, height: size, backgroundColor: background },
      ]}
    >
      {piece !== "" && (
        <ChessPieceIcon
          type={lower as PieceType}
          color={(piece === lower ? "b" : "w") as PieceColor}
          size={size * 0.8}
        />
      )}
      {/* Over the piece, as the web's overlay is. */}
      {tint !== undefined && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: tint }]}
        />
      )}
      {rankLabel !== null && (
        <Text style={[styles.rankLabel, { color: labelColor }]}>
          {rankLabel}
        </Text>
      )}
      {fileLabel !== null && (
        <Text style={[styles.fileLabel, { color: labelColor }]}>
          {fileLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // The web's `rounded-md`.
  container: {
    alignSelf: "center",
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
  square: {
    alignItems: "center",
    justifyContent: "center",
  },
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  fileLabel: {
    position: "absolute",
    bottom: 1,
    right: 2,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
