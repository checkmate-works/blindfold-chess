'use client';

import { useCallback, useMemo, useRef } from 'react';

import { BoardLayout, BoardOverlay, ChessPiece } from '@/app/_components';
import type { SquareRenderInfo } from '@/app/_components';
import type { Color } from '@blindfold-chess/features/chess-core';
import { executeMove, fenToBoard } from '@blindfold-chess/features/chess-core';
import { fenToPlacements } from '@blindfold-chess/features/chess-core/fen';
import type { PieceType } from '@blindfold-chess/types';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';

import { usePieceAnimation } from '../_hooks/use-piece-animation';

type Props = {
  initialFen: string;
  move?: string;
  showCoordinates?: boolean;
  animationDuration?: number;
  className?: string;
  autoPlay?: boolean;
  flipped?: boolean;
  boardTheme?: BoardTheme;
  children?: React.ReactNode;
};

// Parse FEN into piece list, with manual fallback for invalid positions (e.g. missing king)
function parseFenToPieces(fen: string): Array<{ type: PieceType; color: Color; square: string }> {
  try {
    const board = fenToBoard(fen);
    const result: Array<{ type: PieceType; color: Color; square: string }> = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const square = String.fromCharCode(97 + file) + (8 - rank);
          result.push({ type: piece.type, color: piece.color, square });
        }
      }
    }

    return result;
  } catch (error) {
    // chess.js rejects positions the practice modules legitimately show —
    // a board with no king, say — so fall back to the non-validating parser
    // rather than rendering nothing.
    try {
      return fenToPlacements(fen);
    } catch {
      console.error('Error parsing FEN:', error);
      return [];
    }
  }
}

export function AnimatedChessBoard({
  initialFen,
  move,
  showCoordinates = true,
  animationDuration = 500,
  className = '',
  autoPlay = false,
  flipped = false,
  boardTheme = DEFAULT_BOARD_THEME,
  children,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const themeColors = getBoardThemeColors(boardTheme);

  // Parse move details
  const moveDetails = useMemo(() => {
    if (!move) return null;
    try {
      const result = executeMove(initialFen, move);
      if (!result) return null;

      return {
        from: result.moveResult.from,
        to: result.moveResult.to,
        piece: result.moveResult.piece,
        color: result.moveResult.color,
        finalFen: result.fen,
      };
    } catch (error) {
      console.error('Error parsing move:', error);
      return null;
    }
  }, [initialFen, move]);

  const {
    currentFen,
    isAnimating,
    showPlayButton,
    hiddenSquare,
    animatingPiece,
    animatingPieceStyle,
    handlePlay,
    handleReplay,
  } = usePieceAnimation({
    initialFen,
    moveDetails,
    animationDuration,
    autoPlay,
    boardRef,
    flipped,
  });

  const pieces = useMemo(() => parseFenToPieces(currentFen), [currentFen]);

  const pieceBySquare = useMemo(() => new Map(pieces.map((p) => [p.square, p])), [pieces]);

  const renderSquare = useCallback(
    ({ square }: SquareRenderInfo) => {
      const piece = pieceBySquare.get(square);
      if (!piece || piece.square === hiddenSquare) return null;

      return (
        <div className="w-[80%] h-[80%] flex items-center justify-center">
          <ChessPiece type={piece.type} color={piece.color} size={45} />
        </div>
      );
    },
    [pieceBySquare, hiddenSquare]
  );

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <div className="w-full">
        <div className="relative" ref={boardRef}>
          {/* Chess board */}
          <BoardLayout
            flipped={flipped}
            showCoordinates={showCoordinates}
            themeColors={themeColors}
            renderSquare={renderSquare}
          />

          {/* Play button overlay */}
          <BoardOverlay isVisible={showPlayButton && !isAnimating && !!move}>
            <button
              onClick={handlePlay}
              className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110 pointer-events-auto"
              aria-label="Play animation"
            >
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </BoardOverlay>

          {/* Animating piece */}
          {animatingPiece && (
            <div style={animatingPieceStyle}>
              <div className="w-[80%] h-[80%] flex items-center justify-center">
                <ChessPiece type={animatingPiece.type} color={animatingPiece.color} size={45} />
              </div>
            </div>
          )}

          {children}
        </div>
      </div>

      {/* Replay button */}
      {!showPlayButton && !isAnimating && move && (
        <div className="mt-4">
          <button
            onClick={handleReplay}
            className="p-2 bg-foreground hover:bg-foreground/90 text-background rounded-lg transition-colors"
            aria-label="Replay animation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
