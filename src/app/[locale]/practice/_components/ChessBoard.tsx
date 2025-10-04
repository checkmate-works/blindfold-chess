'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Chess } from 'chess.js';

// SVG Chess Pieces (Lichess cburnett style)
export const ChessPieces = {
  wP: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <path
        fill="#fff"
        stroke="#000"
        strokeLinecap="round"
        strokeWidth="1.5"
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
      />
    </svg>
  ),
  bP: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <path
        stroke="#000"
        strokeLinecap="round"
        strokeWidth="1.5"
        d="M22.5 9a4 4 0 0 0-3.22 6.38 6.48 6.48 0 0 0-.87 10.65c-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46 6.46 0 0 0-.87-10.65A4.01 4.01 0 0 0 22.5 9z"
      />
    </svg>
  ),
  wR: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="#fff"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="butt"
          d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5"
        />
        <path d="m34 14-3 3H14l-3-3" />
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M31 17v12.5H14V17" />
        <path d="m31 29.5 1.5 2.5h-20l1.5-2.5" />
        <path fill="none" strokeLinejoin="miter" d="M11 14h23" />
      </g>
    </svg>
  ),
  bR: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="butt"
          d="M9 39h27v-3H9v3zm3.5-7 1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z"
        />
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M14 29.5v-13h17v13H14z" />
        <path
          strokeLinecap="butt"
          d="M14 16.5 11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"
        />
        <path
          fill="none"
          stroke="#ececec"
          strokeLinejoin="miter"
          strokeWidth="1"
          d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23"
        />
      </g>
    </svg>
  ),
  wN: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="none"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path
          fill="#fff"
          d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
        />
        <path
          fill="#000"
          d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"
        />
      </g>
    </svg>
  ),
  bN: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="none"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path fill="#000" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path
          fill="#000"
          d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"
        />
        <path
          fill="#ececec"
          stroke="#ececec"
          d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.43-9.75a.5 1.5 30 1 1-.86-.5.5 1.5 30 1 1 .86.5z"
        />
        <path
          fill="#ececec"
          stroke="none"
          d="m24.55 10.4-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z"
        />
      </g>
    </svg>
  ),
  wB: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="none"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <g fill="#fff" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </g>
        <path strokeLinejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" />
      </g>
    </svg>
  ),
  bB: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="none"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <g fill="#000" strokeLinecap="butt">
          <path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-2 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </g>
        <path
          stroke="#ececec"
          strokeLinejoin="miter"
          d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"
        />
      </g>
    </svg>
  ),
  wQ: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="#fff"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
        <path
          strokeLinecap="butt"
          d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"
        />
        <path
          strokeLinecap="butt"
          d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
        />
        <path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" />
      </g>
    </svg>
  ),
  bQ: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <g stroke="none">
          <circle cx="6" cy="12" r="2.75" />
          <circle cx="14" cy="9" r="2.75" />
          <circle cx="22.5" cy="8" r="2.75" />
          <circle cx="31" cy="9" r="2.75" />
          <circle cx="39" cy="12" r="2.75" />
        </g>
        <path
          strokeLinecap="butt"
          d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"
        />
        <path
          strokeLinecap="butt"
          d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
        />
        <path fill="none" strokeLinecap="butt" d="M11 38.5a35 35 1 0 0 23 0" />
        <path
          fill="none"
          stroke="#ececec"
          d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0"
        />
      </g>
    </svg>
  ),
  wK: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="none"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5" />
        <path
          fill="#fff"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
        />
        <path
          fill="#fff"
          d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"
        />
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
      </g>
    </svg>
  ),
  bK: ({ size = 45 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width={size} height={size}>
      <g
        fill="none"
        fillRule="evenodd"
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      >
        <path strokeLinejoin="miter" d="M22.5 11.6V6" />
        <path
          fill="#000"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
        />
        <path
          fill="#000"
          d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"
        />
        <path fill="none" d="M20 8h5" />
        <path
          stroke="#ececec"
          d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9"
        />
        <path
          stroke="#ececec"
          d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"
        />
      </g>
    </svg>
  ),
};

interface AnimatingPiece {
  type: string;
  color: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  startTime: number;
}

interface ChessBoardProps {
  initialFen: string;
  move?: string;
  showCoordinates?: boolean;
  animationDuration?: number;
  className?: string;
  autoPlay?: boolean;
  flipped?: boolean;
}

export function ChessBoard({
  initialFen,
  move,
  showCoordinates = true,
  animationDuration = 500,
  className = '',
  autoPlay = false,
  flipped = false,
}: ChessBoardProps) {
  const [currentFen, setCurrentFen] = useState(initialFen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(!autoPlay);
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);
  const [hiddenSquare, setHiddenSquare] = useState<string | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const boardRef = useRef<HTMLDivElement>(null);

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
      const flatBoard: Array<{ type: string; color: string; square: string }> = [];

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
        const flatBoard: Array<{ type: string; color: string; square: string }> = [];

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
                type: char.toLowerCase(),
                color: isWhite ? 'w' : 'b',
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

      if (progress >= 1) {
        // Animation complete
        setCurrentFen(moveDetails.finalFen);
        setAnimatingPiece(null);
        setHiddenSquare(null);
        setIsAnimating(false);
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

  const renderPiece = (piece: { type: string; color: string }) => {
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

  // Calculate position for animating piece
  const getAnimatingPieceStyle = () => {
    if (!animatingPiece || !boardRef.current) return {};

    const elapsed = Date.now() - animatingPiece.startTime;
    const progress = Math.min(elapsed / animationDuration, 1);

    // Ease-in-out animation
    const easeProgress =
      progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentX =
      animatingPiece.from.x + (animatingPiece.to.x - animatingPiece.from.x) * easeProgress;
    const currentY =
      animatingPiece.from.y + (animatingPiece.to.y - animatingPiece.from.y) * easeProgress;

    const boardRect = boardRef.current.getBoundingClientRect();
    const squareSize = boardRect.width / 8;

    return {
      position: 'absolute' as const,
      left: `${currentX}px`,
      top: `${currentY}px`,
      width: `${squareSize}px`,
      height: `${squareSize}px`,
      zIndex: 1000,
      pointerEvents: 'none' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  };

  // Get piece component for animating piece
  const renderAnimatingPiece = () => {
    if (!animatingPiece) return null;

    const pieceKey =
      `${animatingPiece.color}${animatingPiece.type.toUpperCase()}` as keyof typeof ChessPieces;
    const PieceComponent = ChessPieces[pieceKey];

    if (!PieceComponent) return null;

    return (
      <div className="w-[80%] h-[80%] flex items-center justify-center">
        <PieceComponent size={45} />
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
                    <div
                      key={file}
                      className={`w-[12.5%] h-full relative flex items-center justify-center ${
                        isLight
                          ? 'bg-stone-200 dark:bg-stone-300'
                          : 'bg-stone-600 dark:bg-stone-700'
                      }`}
                    >
                      {piece && piece.square !== hiddenSquare && (
                        <div className="flex items-center justify-center w-full h-full">
                          {renderPiece(piece)}
                        </div>
                      )}

                      {/* Coordinates */}
                      {showCoordinates && (
                        <>
                          {fileIndex === 0 && (
                            <div
                              className={`absolute left-0.5 top-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${
                                isLight
                                  ? 'text-stone-700 dark:text-stone-800'
                                  : 'text-stone-300 dark:text-stone-200'
                              }`}
                            >
                              {rank}
                            </div>
                          )}
                          {rankIndex === ranks.length - 1 && (
                            <div
                              className={`absolute right-0.5 bottom-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${
                                isLight
                                  ? 'text-stone-700 dark:text-stone-800'
                                  : 'text-stone-300 dark:text-stone-200'
                              }`}
                            >
                              {file}
                            </div>
                          )}
                        </>
                      )}
                    </div>
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
          {animatingPiece && <div style={getAnimatingPieceStyle()}>{renderAnimatingPiece()}</div>}
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
