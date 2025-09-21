'use client';

import { useEffect, useState, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { ChessPieces } from '../../practice/_components/ChessBoard';

type BoardPiece = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;

interface SimpleChessBoardProps {
  fen: string;
  flipped?: boolean;
  lastMove?: { from: string; to: string } | null;
  onSquareClick?: (square: string) => void;
  highlightedSquares?: string[];
  className?: string;
}

export function SimpleChessBoard({
  fen,
  flipped = false,
  lastMove = null,
  onSquareClick,
  highlightedSquares = [],
  className = '',
}: SimpleChessBoardProps) {
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

    const pieceKey = `${piece.color}${piece.type.toUpperCase()}` as keyof typeof ChessPieces;
    const PieceComponent = ChessPieces[pieceKey];

    if (PieceComponent) {
      return (
        <div className="w-[80%] h-[80%] flex items-center justify-center">
          <PieceComponent size={45} />
        </div>
      );
    }

    return null;
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
                  {fileIndex === 0 && (
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
                  {rankIndex === 7 && (
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
