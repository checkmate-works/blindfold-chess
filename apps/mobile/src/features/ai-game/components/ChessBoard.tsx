import { useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import {
  fenToBoard,
  type BoardPiece,
} from "@blindfold-chess/features/chess-core";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType, PieceColor } from "@blindfold-chess/icons";
import { chessColors, spacing, fontSize } from "../../../theme";

type ChessBoardProps = {
  fen: string;
  flipped?: boolean;
  showCoordinates?: boolean;
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

export function ChessBoard({
  fen,
  flipped = false,
  showCoordinates = true,
}: ChessBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const maxBoardSize = screenWidth - spacing.lg * 2;
  const boardSize = Math.min(maxBoardSize, 400);
  const squareSize = boardSize / 8;

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

  const isLightSquare = (fileIndex: number, rankIndex: number) => {
    const actualFileIndex = flipped ? 7 - fileIndex : fileIndex;
    const actualRankIndex = flipped ? 7 - rankIndex : rankIndex;
    return (actualFileIndex + actualRankIndex) % 2 === 0;
  };

  const pieceSize = squareSize * 0.8;

  return (
    <View style={[styles.container, { width: boardSize, height: boardSize }]}>
      {displayBoard.map((row, rankIndex) => (
        <View key={rankIndex} style={styles.row}>
          {row.map((piece, fileIndex) => {
            const light = isLightSquare(fileIndex, rankIndex);
            return (
              <View
                key={fileIndex}
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: light
                      ? chessColors.boardLight
                      : chessColors.boardDark,
                  },
                ]}
              >
                {piece && (
                  <View style={styles.pieceContainer}>
                    <ChessPieceIcon
                      type={piece.type as PieceType}
                      color={piece.color as PieceColor}
                      size={pieceSize}
                    />
                  </View>
                )}
                {showCoordinates && fileIndex === 0 && (
                  <Text
                    style={[
                      styles.rankLabel,
                      {
                        color: light
                          ? chessColors.boardDark
                          : chessColors.boardLight,
                      },
                    ]}
                  >
                    {displayRanks[rankIndex]}
                  </Text>
                )}
                {showCoordinates && rankIndex === 7 && (
                  <Text
                    style={[
                      styles.fileLabel,
                      {
                        color: light
                          ? chessColors.boardDark
                          : chessColors.boardLight,
                      },
                    ]}
                  >
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
