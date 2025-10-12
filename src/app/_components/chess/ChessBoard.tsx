'use client';

import { useEffect, useMemo, useState } from 'react';

import { ChessPiece } from '@/app/_components';
import { Chess, Color, PieceSymbol, Square } from 'chess.js';

import type { Side } from '@/lib/types';

type BoardPiece = {
  square: Square;
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
  className = '',
}: Props) {
  const [board, setBoard] = useState<BoardPiece[][]>([]);

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
                <div
                  key={fileIndex}
                  className={`
                    w-[12.5%] h-full relative flex items-center justify-center cursor-pointer
                    ${isLight ? 'bg-stone-200 dark:bg-stone-300' : 'bg-stone-600 dark:bg-stone-700'}
                    ${isLastMove ? 'ring-2 ring-yellow-400 ring-inset' : ''}
                    ${isHighlight ? 'ring-2 ring-green-400 ring-inset' : ''}
                    hover:opacity-80
                  `}
                  onClick={() => onSquareClick && onSquareClick(square)}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    {renderPiece(piece)}
                  </div>

                  {/* Coordinates */}
                  {showCoordinates && fileIndex === 0 && (
                    <div
                      className={`absolute left-0.5 top-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${
                        isLight
                          ? 'text-stone-700 dark:text-stone-800'
                          : 'text-stone-300 dark:text-stone-200'
                      }`}
                    >
                      {displayRanks[rankIndex]}
                    </div>
                  )}
                  {showCoordinates && rankIndex === 7 && (
                    <div
                      className={`absolute right-0.5 bottom-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${
                        isLight
                          ? 'text-stone-700 dark:text-stone-800'
                          : 'text-stone-300 dark:text-stone-200'
                      }`}
                    >
                      {displayFiles[fileIndex]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
