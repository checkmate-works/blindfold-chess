import { useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import {
  fenToBoard,
  type BoardPiece,
} from "@blindfold-chess/features/chess-core";
import {
  DISPLAY_RANKS,
  FILES,
  flipIndex,
  isLightSquare,
} from "@blindfold-chess/features/common";
import {
  resolvePieceDisplay,
  resolveSquareHighlight,
  type BlindfoldDisplaySettings,
  type PieceDisplay,
} from "@blindfold-chess/features/board-display";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType, PieceColor } from "@blindfold-chess/icons";
import type { Side } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { useGamePreferences } from "../../../lib/game-preferences";
import { chessColors, spacing, fontSize } from "../../../theme";

type ChessBoardProps = {
  fen: string;
  flipped?: boolean;
  /**
   * Overrides the player's `showCoordinates` preference. A teaching board
   * that always wants the labels passes `true`; a game board leaves it unset.
   */
  showCoordinates?: boolean;
  /** Squares of the last move, tinted when `highlightLastMove` is on. */
  lastMove?: { from: string; to: string } | null;
  /**
   * The side the player is playing. Setting it marks this as a game board:
   * the blindfold piece preferences (hidden sides, stones, single colour,
   * hidden pawns) apply, with "own" meaning this side. Left unset — a
   * practice or teaching board — every piece is drawn normally.
   */
  playerColor?: Side;
};

const RANKS = DISPLAY_RANKS;

/** `chessColors.boardHighlight` at the strength lichess tints a last move. */
const LAST_MOVE_TINT = `${chessColors.boardHighlight}66`;

/**
 * Read-only board for the AI game and the notation lessons. It reads the
 * player's global board preferences itself — theme, coordinates, last-move
 * highlight and, on a game board, the blindfold display rules from
 * `@blindfold-chess/features/board-display` — so callers pass only the
 * position and whose board it is.
 */
export function ChessBoard({
  fen,
  flipped = false,
  showCoordinates,
  lastMove = null,
  playerColor,
}: ChessBoardProps) {
  const { preferences } = useGamePreferences();
  const { width: screenWidth } = useWindowDimensions();
  const maxBoardSize = screenWidth - spacing.lg * 2;
  const boardSize = Math.min(maxBoardSize, 400);
  const squareSize = boardSize / 8;
  const theme = boardThemeColors[preferences.boardTheme];
  const coordinatesShown = showCoordinates ?? preferences.showCoordinates;
  const highlightedMove = preferences.highlightLastMove ? lastMove : null;

  const displaySettings = useMemo<BlindfoldDisplaySettings | null>(
    () =>
      playerColor
        ? {
            ownColor: playerColor === "white" ? "w" : "b",
            showOwnPieces: preferences.showOwnPieces,
            showOpponentPieces: preferences.showOpponentPieces,
            pieceShapeMode: preferences.pieceShapeMode,
            pieceColors: preferences.pieceColors,
            pawnHideMode: preferences.pawnHideMode,
            hiddenPieceStyle: "absent",
          }
        : null,
    [
      playerColor,
      preferences.showOwnPieces,
      preferences.showOpponentPieces,
      preferences.pieceShapeMode,
      preferences.pieceColors,
      preferences.pawnHideMode,
    ],
  );

  const board = useMemo(() => {
    try {
      return fenToBoard(fen);
    } catch {
      return Array(8)
        .fill(null)
        .map(() => Array(8).fill(null)) as BoardPiece[][];
    }
  }, [fen]);

  const displayBoard = useMemo(() => {
    if (flipped) {
      return board
        .slice()
        .reverse()
        .map((row) => row.slice().reverse());
    }
    return board;
  }, [board, flipped]);

  const displayFiles = flipped ? FILES.slice().reverse() : FILES;
  const displayRanks = flipped ? RANKS.slice().reverse() : RANKS;

  const pieceSize = squareSize * 0.8;

  return (
    <View style={[styles.container, { width: boardSize, height: boardSize }]}>
      {displayBoard.map((row, rankIndex) => (
        <View key={rankIndex} style={styles.row}>
          {row.map((piece, fileIndex) => {
            const actualFileIndex = flipIndex(fileIndex, flipped);
            const actualRankIndex = flipIndex(rankIndex, flipped);
            const light = isLightSquare(actualFileIndex, actualRankIndex);
            const square = `${FILES[actualFileIndex]}${RANKS[actualRankIndex]}`;
            const highlight = resolveSquareHighlight({
              isSelected: false,
              isCaptureDest: false,
              isLegalDestination: false,
              isLastMove:
                highlightedMove !== null &&
                (square === highlightedMove.from ||
                  square === highlightedMove.to),
              isExternalHighlight: false,
            });
            const display: PieceDisplay | null = piece
              ? displaySettings
                ? resolvePieceDisplay(piece, displaySettings)
                : { kind: "piece", type: piece.type, color: piece.color }
              : null;
            const labelColor = light ? theme.lightText : theme.darkText;
            return (
              <View
                key={fileIndex}
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: light ? theme.light : theme.dark,
                  },
                ]}
              >
                {highlight === "last-move" && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: LAST_MOVE_TINT },
                    ]}
                  />
                )}
                {display && <PieceGlyph display={display} size={pieceSize} />}
                {coordinatesShown && fileIndex === 0 && (
                  <Text style={[styles.rankLabel, { color: labelColor }]}>
                    {displayRanks[rankIndex]}
                  </Text>
                )}
                {coordinatesShown && rankIndex === 7 && (
                  <Text style={[styles.fileLabel, { color: labelColor }]}>
                    {displayFiles[fileIndex]}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Draws one resolved piece. `ghost` and faint stones only arise with the
 * review's `hiddenPieceStyle: 'ghost'`, which this live board never asks
 * for; they are drawn translucent anyway so the mapping is total.
 */
function PieceGlyph({
  display,
  size,
}: {
  display: PieceDisplay;
  size: number;
}) {
  if (display.kind === "absent") return null;
  if (display.kind === "circle") {
    const stone = size * 0.75;
    return (
      <View
        style={[
          styles.stone,
          {
            width: stone,
            height: stone,
            borderRadius: stone / 2,
            backgroundColor: display.color === "w" ? "#ffffff" : "#1f1f1f",
            opacity: display.faint ? 0.35 : 1,
          },
        ]}
      />
    );
  }
  return (
    <View
      style={[styles.pieceContainer, display.kind === "ghost" && styles.ghost]}
    >
      <ChessPieceIcon
        type={display.type as PieceType}
        color={display.color as PieceColor}
        size={size}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderRadius: 4,
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
  pieceContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: {
    opacity: 0.35,
  },
  stone: {
    borderWidth: 1,
    borderColor: "#555555",
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
