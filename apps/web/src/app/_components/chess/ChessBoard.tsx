'use client';

import { memo, useCallback, useMemo } from 'react';

import { ChessPiece, Square } from '@/app/_components';
import type { Side } from '@blindfold-chess/types';
import { Chess, Color, PieceSymbol, Square as SquareType } from 'chess.js';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';
import type { EvaluationMark } from '@/lib/evaluation';
import { getEvaluationIcon } from '@/lib/evaluation';

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
  rounded?: boolean;
  evaluationMark?: EvaluationMark | null;
  className?: string;
};

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

const isLightSquare = (file: number, rank: number) => {
  return (file + rank) % 2 === 0;
};

const getSquareName = (fileIndex: number, rankIndex: number) => {
  return `${files[fileIndex]}${ranks[rankIndex]}`;
};

export const ChessBoard = memo(function ChessBoard({
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
  boardTheme = DEFAULT_BOARD_THEME,
  rounded = true,
  evaluationMark = null,
  className = '',
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);

  const board = useMemo(() => {
    try {
      const chess = new Chess(fen);
      return chess.board();
    } catch (error) {
      console.error('Invalid FEN:', error);
      // Return empty board on error
      return Array(8)
        .fill(null)
        .map(() => Array(8).fill(null)) as BoardPiece[][];
    }
  }, [fen]);

  const renderPiece = useCallback(
    (piece: BoardPiece) => {
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
        // Show as Go stone-like circle with subtle gradient and shadow
        if (displayColor === 'w') {
          return (
            <div
              className="w-[60%] h-[60%] rounded-full shadow-lg"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 30%, #ffffff 0%, #e8e8e8 50%, #d0d0d0 100%)',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(0, 0, 0, 0.1)',
              }}
            />
          );
        } else {
          return (
            <div
              className="w-[60%] h-[60%] rounded-full shadow-lg"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 30%, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)',
                boxShadow:
                  '2px 2px 4px rgba(0, 0, 0, 0.4), inset -1px -1px 3px rgba(255, 255, 255, 0.1)',
              }}
            />
          );
        }
      }

      // Show normal piece
      return (
        <div className="w-[80%] h-[80%] flex items-center justify-center">
          <ChessPiece type={piece.type} color={displayColor} size={45} />
        </div>
      );
    },
    [playerSide, showOwnPieces, showOpponentPieces, pieceShapeMode, pieceColors]
  );

  const handleBoardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSquareClick) return;
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-square]');
      if (target?.dataset.square) {
        onSquareClick(target.dataset.square);
      }
    },
    [onSquareClick]
  );

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
      <div
        className={`relative w-full aspect-square border border-border overflow-hidden ${rounded ? 'rounded-md shadow-lg' : ''}`}
        onClick={onSquareClick ? handleBoardClick : undefined}
      >
        {displayBoard.map((row, rankIndex) => (
          <div key={rankIndex} className="flex h-[12.5%]">
            {row.map((piece, fileIndex) => {
              const actualRankIndex = flipped ? 7 - rankIndex : rankIndex;
              const actualFileIndex = flipped ? 7 - fileIndex : fileIndex;
              const square = getSquareName(actualFileIndex, actualRankIndex);
              const isLight = isLightSquare(actualFileIndex, actualRankIndex);
              const isLastMove = isLastMoveSquare(square);
              const isHighlight = isHighlighted(square);

              // Check if this square should show evaluation mark
              const showEvalMark = evaluationMark && evaluationMark.square === square;
              const evalBadge = showEvalMark
                ? getEvaluationIcon(evaluationMark.loss, evaluationMark.isMate)
                : undefined;

              // NOTE: Inside ChessBoard, Square's React.memo has limited effect because
              // children (renderPiece result) is a new JSX reference each render.
              // The primary optimization here is event delegation (eliminating 64 onClick closures).
              // Square's memo is more effective for external consumers (KnightTourBoard, EditableChessBoard, etc.).
              return (
                <Square
                  key={fileIndex}
                  file={displayFiles[fileIndex]}
                  rank={displayRanks[rankIndex]}
                  isLight={isLight}
                  showCoordinates={showCoordinates}
                  // NOTE: Rank/file labels are always shown on the left and bottom edges of
                  // the visual board, matching Chess.com's convention. Lichess instead pins
                  // labels to the a-file and 1st-rank squares regardless of orientation.
                  // Consider adopting the Lichess style if feedback warrants it.
                  showRankCoordinate={fileIndex === 0}
                  showFileCoordinate={rankIndex === 7}
                  dataSquare={onSquareClick ? square : undefined}
                  highlightType={isLastMove ? 'last-move' : isHighlight ? 'selectable' : 'none'}
                  themeColors={themeColors}
                  badge={evalBadge}
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
});
