'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChessPiece, Square } from '@/app/_components';
import { Chess, Color, PieceSymbol } from 'chess.js';

import type { BoardTheme } from '@/lib/boardThemes';
import { getBoardThemeColors } from '@/lib/boardThemes';

type AnimatingPiece = {
  type: PieceSymbol;
  color: Color;
  from: { x: number; y: number };
  to: { x: number; y: number };
  startTime: number;
};

type Props = {
  initialFen: string;
  move?: string;
  showCoordinates?: boolean;
  animationDuration?: number;
  className?: string;
  autoPlay?: boolean;
  flipped?: boolean;
  boardTheme?: BoardTheme;
};

export function AnimatedChessBoard({
  initialFen,
  move,
  showCoordinates = true,
  animationDuration = 500,
  className = '',
  autoPlay = false,
  flipped = false,
  boardTheme = 'default',
}: Props) {
  const [currentFen, setCurrentFen] = useState(initialFen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(!autoPlay);
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
  const [hiddenSquare, setHiddenSquare] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const boardRef = useRef<HTMLDivElement>(null);
  const themeColors = getBoardThemeColors(boardTheme);

  // Reset state when initialFen or move changes (new exercise)
  useEffect(() => {
    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    // Reset all state
    setCurrentFen(initialFen);
    setShowPlayButton(!autoPlay);
    setAnimatingPiece(null);
    setHiddenSquare(null);
    setIsAnimating(false);
  }, [initialFen, move, autoPlay]);

  // Parse move details
  const moveDetails = useMemo(() => {
    if (!move) return null;
    try {
      const chess = new Chess(initialFen);
      const moveResult = chess.move(move);

      if (!moveResult) {
        console.error('Invalid move:', move);
        return null;
      }

      return {
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        color: moveResult.color,
        finalFen: chess.fen(),
      };
    } catch (error) {
      console.error('Error parsing move:', error);
      return null;
    }
  }, [initialFen, move]);

  // Parse the current position
  const pieces = useMemo(() => {
    try {
      // Try using chess.js first for valid positions
      const chess = new Chess(currentFen);
      const board = chess.board();
      const flatBoard: Array<{ type: PieceSymbol; color: Color; square: string }> = [];

      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = board[rank][file];
          if (piece) {
            const square = String.fromCharCode(97 + file) + (8 - rank);
            flatBoard.push({
              type: piece.type,
              color: piece.color,
              square,
            });
          }
        }
      }

      return flatBoard;
    } catch (error) {
      // If chess.js fails (e.g., missing king), parse FEN manually
      try {
        const fenParts = currentFen.split(' ');
        const piecePlacement = fenParts[0];
        const flatBoard: Array<{ type: PieceSymbol; color: Color; square: string }> = [];

        const ranks = piecePlacement.split('/');
        for (let rank = 0; rank < ranks.length; rank++) {
          let file = 0;
          for (const char of ranks[rank]) {
            if (/\d/.test(char)) {
              // Empty squares
              file += parseInt(char);
            } else {
              // Piece
              const square = String.fromCharCode(97 + file) + (8 - rank);
              const isWhite = char === char.toUpperCase();
              flatBoard.push({
                type: char.toLowerCase() as PieceSymbol,
                color: (isWhite ? 'w' : 'b') as Color,
                square,
              });
              file++;
            }
          }
        }

        return flatBoard;
      } catch {
        console.error('Error parsing FEN:', error);
        return [];
      }
    }
  }, [currentFen]);

  // Get pixel position for a square
  const getSquarePosition = useCallback((square: string): { left: number; top: number } | null => {
    if (!boardRef.current) return null;

    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    const boardRect = boardRef.current.getBoundingClientRect();
    const squareSize = boardRect.width / 8;

    return {
      left: file * squareSize,
      top: (7 - rank) * squareSize,
    };
  }, []);

  // Animate the piece movement
  const animateMove = useCallback(() => {
    if (!moveDetails || isAnimating) return;

    setIsAnimating(true);
    setShowPlayButton(false);

    const fromPos = getSquarePosition(moveDetails.from);
    const toPos = getSquarePosition(moveDetails.to);

    if (!fromPos || !toPos) {
      setCurrentFen(moveDetails.finalFen);
      setIsAnimating(false);
      return;
    }

    const startTime = Date.now();

    // Set up the animating piece and hide the original
    setAnimatingPiece({
      type: moveDetails.piece,
      color: moveDetails.color,
      from: { x: fromPos.left, y: fromPos.top },
      to: { x: toPos.left, y: toPos.top },
      startTime: startTime,
    });
    setHiddenSquare(moveDetails.from);

    // Animate using requestAnimationFrame
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Update progress state to trigger re-render
      setAnimationProgress(progress);

      if (progress >= 1) {
        // Animation complete
        setCurrentFen(moveDetails.finalFen);
        setAnimatingPiece(null);
        setHiddenSquare(null);
        setIsAnimating(false);
        setAnimationProgress(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  }, [moveDetails, isAnimating, getSquarePosition, animationDuration]);

  // Handle play button click
  const handlePlay = useCallback(() => {
    animateMove();
  }, [animateMove]);

  // Handle replay
  const handleReplay = useCallback(() => {
    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    setCurrentFen(initialFen);
    setShowPlayButton(false);
    setAnimatingPiece(null);
    setHiddenSquare(null);
    setIsAnimating(false);
    // Immediately trigger animation
    setTimeout(() => {
      animateMove();
    }, 100);
  }, [initialFen, animateMove]);

  // Auto-play on mount if enabled
  useEffect(() => {
    if (autoPlay && !isAnimating && showPlayButton && moveDetails) {
      animateMove();
    }
  }, [autoPlay, animateMove, isAnimating, showPlayButton, moveDetails]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

  // Calculate position for animating piece using pixel positions stored in state
  // This avoids accessing boardRef.current during render
  const animatingPieceStyle = useMemo(() => {
    if (!animatingPiece) return {};

    // Use state-based progress instead of Date.now()
    const progress = animationProgress;

    // Ease-in-out animation
    const easeProgress =
      progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Calculate current position based on stored pixel coordinates
    const currentX =
      animatingPiece.from.x + (animatingPiece.to.x - animatingPiece.from.x) * easeProgress;
    const currentY =
      animatingPiece.from.y + (animatingPiece.to.y - animatingPiece.from.y) * easeProgress;

    return {
      position: 'absolute' as const,
      left: `${currentX}px`,
      top: `${currentY}px`,
      width: '12.5%',
      height: '12.5%',
      zIndex: 1000,
      pointerEvents: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }, [animatingPiece, animationProgress]);

  // Get piece component for animating piece
  const renderAnimatingPiece = () => {
    if (!animatingPiece) return null;

    return (
      <div className="w-[80%] h-[80%] flex items-center justify-center">
        <ChessPiece type={animatingPiece.type} color={animatingPiece.color} size={45} />
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
          {showPlayButton && !isAnimating && move && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md pointer-events-none">
              <button
                onClick={handlePlay}
                className="bg-white/90 hover:bg-white text-gray-800 rounded-full p-6 shadow-lg transition-all hover:scale-110 pointer-events-auto"
                aria-label="Play animation"
              >
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          )}

          {/* Animating piece */}
          {animatingPiece && <div style={animatingPieceStyle}>{renderAnimatingPiece()}</div>}
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
