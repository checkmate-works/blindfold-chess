'use client';

import { useEffect, useMemo, useState } from 'react';

import { Square } from '@/app/_components';
import { Chess, Color, PieceSymbol, Square as SquareType } from 'chess.js';

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
                  piece={piece}
                  playerSide={playerSide}
                  showOwnPieces={showOwnPieces}
                  showOpponentPieces={showOpponentPieces}
                  pieceShapeMode={pieceShapeMode}
                  pieceColors={pieceColors}
                  showCoordinates={showCoordinates}
                  showRankCoordinate={fileIndex === 0}
                  showFileCoordinate={rankIndex === 7}
                  onClick={onSquareClick ? () => onSquareClick(square) : undefined}
                  highlightType={isLastMove ? 'last-move' : isHighlight ? 'selectable' : 'none'}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
