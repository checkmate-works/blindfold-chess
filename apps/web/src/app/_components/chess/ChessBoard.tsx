'use client';

import { memo, useCallback, useMemo } from 'react';

import { ChessPiece } from '@/app/_components';
import type { BoardPiece } from '@blindfold-chess/features/chess-core';
import { fenToBoard } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';
import type { EvaluationMark } from '@/lib/evaluation';
import { getEvaluationIcon } from '@/lib/evaluation';

import type { SquareRenderInfo } from './BoardLayout';
import { BoardLayout } from './BoardLayout';

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
      return fenToBoard(fen);
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

  const renderSquare = useCallback(
    ({ fileIndex, rankIndex }: SquareRenderInfo) => {
      const piece = board[rankIndex][fileIndex];
      return renderPiece(piece);
    },
    [board, renderPiece]
  );

  const squareProps = useCallback(
    ({ square }: SquareRenderInfo) => {
      const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
      const isHighlight = highlightedSquares.includes(square);

      const showEvalMark = evaluationMark && evaluationMark.square === square;
      const evalBadge = showEvalMark
        ? getEvaluationIcon(evaluationMark.loss, evaluationMark.isMate)
        : undefined;

      return {
        dataSquare: onSquareClick ? square : undefined,
        highlightType: (isLastMove ? 'last-move' : isHighlight ? 'selectable' : 'none') as
          | 'none'
          | 'last-move'
          | 'selectable',
        badge: evalBadge,
      };
    },
    [lastMove, highlightedSquares, evaluationMark, onSquareClick]
  );

  return (
    <BoardLayout
      flipped={flipped}
      showCoordinates={showCoordinates}
      themeColors={themeColors}
      renderSquare={renderSquare}
      squareProps={squareProps}
      onBoardClick={onSquareClick ? handleBoardClick : undefined}
      rounded={rounded}
      className={className}
    />
  );
});
