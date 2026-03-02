'use client';

import { useMemo, useRef } from 'react';

import { BoardOverlay, ChessPiece, Square } from '@/app/_components';
import type { Color, PieceSymbol } from '@blindfold-chess/features/chess-core';
import { executeMove, fenToBoard } from '@blindfold-chess/features/chess-core';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

import { usePieceAnimation } from '../_hooks/usePieceAnimation';

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
function parseFenToPieces(fen: string): Array<{ type: PieceSymbol; color: Color; square: string }> {
  try {
    const board = fenToBoard(fen);
    const result: Array<{ type: PieceSymbol; color: Color; square: string }> = [];

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
    try {
      const piecePlacement = fen.split(' ')[0];
      const result: Array<{ type: PieceSymbol; color: Color; square: string }> = [];

      const ranks = piecePlacement.split('/');
      for (let rank = 0; rank < ranks.length; rank++) {
        let file = 0;
        for (const char of ranks[rank]) {
          if (/\d/.test(char)) {
            file += parseInt(char);
          } else {
            const square = String.fromCharCode(97 + file) + (8 - rank);
            const isWhite = char === char.toUpperCase();
            result.push({
              type: char.toLowerCase() as PieceSymbol,
              color: (isWhite ? 'w' : 'b') as Color,
              square,
            });
            file++;
          }
        }
      }

      return result;
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
  });

  const pieces = useMemo(() => parseFenToPieces(currentFen), [currentFen]);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const renderPiece = (piece: { type: PieceSymbol; color: Color; square: string }) => {
    if (piece.square === hiddenSquare) return null;

    return (
      <div className="w-[80%] h-[80%] flex items-center justify-center">
        <ChessPiece type={piece.type} color={piece.color} size={45} />
      </div>
    );
  };

  const getPieceAtSquare = (file: string, rank: string) => {
    const square = file + rank;
    return pieces.find((piece) => piece.square === square);
  };

  const isLightSquare = (fileIndex: number, rankIndex: number) => {
    return (fileIndex + rankIndex) % 2 === 0;
  };

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      <div className="w-full">
        <div className="relative" ref={boardRef}>
          {/* Chess board */}
          <div className="relative w-full aspect-square border border-border rounded-md overflow-hidden shadow-lg">
            {(flipped ? [...ranks].reverse() : ranks).map((rank, rankIndex) => (
              <div key={rank} className="flex h-[12.5%]">
                {(flipped ? [...files].reverse() : files).map((file, fileIndex) => {
                  const actualFileIndex = flipped ? 7 - fileIndex : fileIndex;
                  const actualRankIndex = flipped ? 7 - rankIndex : rankIndex;
                  const isLight = isLightSquare(actualFileIndex, actualRankIndex);
                  const piece = getPieceAtSquare(file, rank);

                  return (
                    <Square
                      key={file}
                      file={file}
                      rank={rank}
                      isLight={isLight}
                      showCoordinates={showCoordinates}
                      showRankCoordinate={fileIndex === 0}
                      showFileCoordinate={rankIndex === ranks.length - 1}
                      themeColors={themeColors}
                    >
                      {piece && renderPiece(piece)}
                    </Square>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Play button overlay */}
          <BoardOverlay isVisible={showPlayButton && !isAnimating && !!move}>
            <button
              onClick={handlePlay}
              className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 shadow-lg transition-all hover:scale-110 pointer-events-auto"
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
