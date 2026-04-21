import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getSquareVisualCell } from '@/app/_components/chess/board-coords';
import type { Color } from '@blindfold-chess/features/chess-core';
import type { PieceType } from '@blindfold-chess/types';

type AnimatingPiece = {
  type: PieceType;
  color: Color;
  from: { x: number; y: number };
  to: { x: number; y: number };
  startTime: number;
};

type MoveDetails = {
  from: string;
  to: string;
  piece: PieceType;
  color: Color;
  finalFen: string;
};

type UsePieceAnimationOptions = {
  initialFen: string;
  moveDetails: MoveDetails | null;
  animationDuration: number;
  autoPlay: boolean;
  boardRef: React.RefObject<HTMLDivElement | null>;
  flipped?: boolean;
};

/**
 * Convert a square name (e.g. "f5") to its top-left pixel offset on the
 * rendered board. Thin wrapper around {@link getSquareVisualCell} — the
 * canonical `(square, flipped)` → visual cell mapping lives there; this
 * function only scales the result to pixel coordinates.
 *
 * @param square - Algebraic square name like "e4"
 * @param boardWidth - Rendered board width in pixels
 * @param flipped - True when the board is drawn from Black's perspective
 * @returns Pixel offset of the square's top-left corner on the rendered board
 */
export function getSquarePixelOffset(
  square: string,
  boardWidth: number,
  flipped: boolean
): { left: number; top: number } {
  const squareSize = boardWidth / 8;
  const { col, row } = getSquareVisualCell(square, flipped);

  return {
    left: col * squareSize,
    top: row * squareSize,
  };
}

type UsePieceAnimationReturn = {
  currentFen: string;
  isAnimating: boolean;
  showPlayButton: boolean;
  hiddenSquare: string | null;
  animatingPiece: { type: PieceType; color: Color } | null;
  animatingPieceStyle: CSSProperties;
  handlePlay: () => void;
  handleReplay: () => void;
};

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function usePieceAnimation({
  initialFen,
  moveDetails,
  animationDuration,
  autoPlay,
  boardRef,
  flipped = false,
}: UsePieceAnimationOptions): UsePieceAnimationReturn {
  const [currentFen, setCurrentFen] = useState(initialFen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(!autoPlay);
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
  const [hiddenSquare, setHiddenSquare] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Reset state when inputs change (new exercise)
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    setCurrentFen(initialFen);
    setShowPlayButton(!autoPlay);
    setAnimatingPiece(null);
    setHiddenSquare(null);
    setIsAnimating(false);
  }, [initialFen, moveDetails, autoPlay]);

  // Get pixel position for a square (accounts for board flip)
  const getSquarePosition = useCallback(
    (square: string): { left: number; top: number } | null => {
      if (!boardRef.current) return null;

      const boardRect = boardRef.current.getBoundingClientRect();
      return getSquarePixelOffset(square, boardRect.width, flipped);
    },
    [boardRef, flipped]
  );

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

    setAnimatingPiece({
      type: moveDetails.piece,
      color: moveDetails.color,
      from: { x: fromPos.left, y: fromPos.top },
      to: { x: toPos.left, y: toPos.top },
      startTime,
    });
    setHiddenSquare(moveDetails.from);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      setAnimationProgress(progress);

      if (progress >= 1) {
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

  const handlePlay = useCallback(() => {
    animateMove();
  }, [animateMove]);

  const handleReplay = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    setCurrentFen(initialFen);
    setShowPlayButton(false);
    setAnimatingPiece(null);
    setHiddenSquare(null);
    setIsAnimating(false);
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

  // Calculate animated piece style with easing
  const animatingPieceStyle = useMemo<CSSProperties>(() => {
    if (!animatingPiece) return {};

    const easeProgress = easeInOut(animationProgress);

    const currentX =
      animatingPiece.from.x + (animatingPiece.to.x - animatingPiece.from.x) * easeProgress;
    const currentY =
      animatingPiece.from.y + (animatingPiece.to.y - animatingPiece.from.y) * easeProgress;

    return {
      position: 'absolute',
      left: `${currentX}px`,
      top: `${currentY}px`,
      width: '12.5%',
      height: '12.5%',
      zIndex: 1000,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }, [animatingPiece, animationProgress]);

  return {
    currentFen,
    isAnimating,
    showPlayButton,
    hiddenSquare,
    animatingPiece: animatingPiece
      ? { type: animatingPiece.type, color: animatingPiece.color }
      : null,
    animatingPieceStyle,
    handlePlay,
    handleReplay,
  };
}
