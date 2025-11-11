'use client';

import { useEffect, useMemo, useState } from 'react';

import { ChessPiece, Square } from '@/app/_components';
import { Chess, Color, PieceSymbol, Square as SquareType } from 'chess.js';

import type { BoardTheme } from '@/lib/boardThemes';
import { getBoardThemeColors } from '@/lib/boardThemes';
import type { Side } from '@/lib/types';

type BoardPiece = {
  square: SquareType;
  type: PieceSymbol;
  color: Color;
} | null;

type Props = {
  fen: string;
  flipped?: boolean;
  playerSide?: Side;
  lastMove?: { from: string; to: string } | null;
  onSquareClick?: (square: string) => void;
  highlightedSquares?: string[];
  showCoordinates?: boolean;
  showOwnPieces?: boolean;
  showOpponentPieces?: boolean;
  pieceShapeMode?: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors?: 'normal' | 'white-only' | 'black-only';
  boardTheme?: BoardTheme;
  className?: string;
};

export function ChessBoard({
  fen,
  flipped = false,
  playerSide = 'white',
  lastMove = null,
  onSquareClick,
  highlightedSquares = [],
  showCoordinates = true,
  showOwnPieces = true,
  showOpponentPieces = true,
  pieceShapeMode = 'normal',
  pieceColors = 'normal',
  boardTheme = 'default',
  className = '',
}: Props) {
  const [board, setBoard] = useState<BoardPiece[][]>([]);
  const themeColors = getBoardThemeColors(boardTheme);

  useEffect(() => {
    try {
      const chess = new Chess(fen);
      setBoard(chess.board());
    } catch (error) {
      console.error('Invalid FEN:', error);
      // Set empty board on error
      setBoard(
        Array(8)
          .fill(null)
          .map(() => Array(8).fill(null))
      );
    }
  }, [fen]);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const renderPiece = (piece: BoardPiece) => {
    if (!piece) return null;

    // Check if piece should be shown based on settings
    const isOwnPiece = piece.color === playerSide.charAt(0);
    if (isOwnPiece && !showOwnPieces) return null;
    if (!isOwnPiece && !showOpponentPieces) return null;

    // Determine if piece should be shown as circle
    const shouldShowAsCircle =
      pieceShapeMode === 'circles-all' ||
      (pieceShapeMode === 'circles-own' && isOwnPiece) ||
      (pieceShapeMode === 'circles-opponent' && !isOwnPiece);

    // Determine piece color based on settings
    let displayColor = piece.color;
    if (pieceColors === 'white-only') {
      displayColor = 'w';
    } else if (pieceColors === 'black-only') {
      displayColor = 'b';
    }

    if (shouldShowAsCircle) {
      // Show as circle with consistent appearance regardless of square color
      const circleColor =
        displayColor === 'w' ? 'bg-white border-gray-800' : 'bg-gray-900 border-gray-300';
      return <div className={`w-[60%] h-[60%] rounded-full border-4 ${circleColor} shadow-md`} />;
    }

    // Show normal piece
    return (
      <div className="w-[80%] h-[80%] flex items-center justify-center">
        <ChessPiece type={piece.type} color={displayColor} size={45} />
      </div>
    );
  };

  const isLightSquare = (file: number, rank: number) => {
    return (file + rank) % 2 === 0;
  };

  const getSquareName = (fileIndex: number, rankIndex: number) => {
    const file = files[fileIndex];
    const rank = ranks[rankIndex];
    return `${file}${rank}`;
  };

  const isLastMoveSquare = (square: string) => {
    return lastMove && (lastMove.from === square || lastMove.to === square);
  };

  const isHighlighted = (square: string) => {
    return highlightedSquares.includes(square);
  };

  const displayBoard = useMemo(() => {
    if (flipped) {
      // Flip both board and indices for black's perspective
      return board
        .slice()
        .reverse()
        .map((row) => row.slice().reverse());
    }
    return board;
  }, [board, flipped]);

  const displayFiles = flipped ? files.slice().reverse() : files;
  const displayRanks = flipped ? ranks.slice().reverse() : ranks;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full aspect-square border border-border rounded-md shadow-lg overflow-hidden">
        {displayBoard.map((row, rankIndex) => (
          <div key={rankIndex} className="flex h-[12.5%]">
            {row.map((piece, fileIndex) => {
              const actualRankIndex = flipped ? 7 - rankIndex : rankIndex;
              const actualFileIndex = flipped ? 7 - fileIndex : fileIndex;
              const square = getSquareName(actualFileIndex, actualRankIndex);
              const isLight = isLightSquare(actualFileIndex, actualRankIndex);
              const isLastMove = isLastMoveSquare(square);
              const isHighlight = isHighlighted(square);

              return (
                <Square
                  key={fileIndex}
                  file={displayFiles[fileIndex]}
                  rank={displayRanks[rankIndex]}
                  isLight={isLight}
                  showCoordinates={showCoordinates}
                  showRankCoordinate={fileIndex === 0}
                  showFileCoordinate={rankIndex === 7}
                  onClick={onSquareClick ? () => onSquareClick(square) : undefined}
                  highlightType={isLastMove ? 'last-move' : isHighlight ? 'selectable' : 'none'}
                  themeColors={themeColors}
                >
                  {renderPiece(piece)}
                </Square>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
