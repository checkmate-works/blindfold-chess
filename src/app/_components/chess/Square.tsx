import { ChessPiece } from '@/app/_components';
import type { Color, PieceSymbol } from 'chess.js';

import type { Side } from '@/lib/types';

type Piece = {
  type: PieceSymbol;
  color: Color;
};

type Props = {
  // Position
  file: string;
  rank: string;
  isLight: boolean;

  // Piece
  piece?: Piece | null;
  hidden?: boolean; // For animation

  // Piece display settings (for ChessBoard)
  playerSide?: Side;
  showOwnPieces?: boolean;
  showOpponentPieces?: boolean;
  pieceShapeMode?: 'normal' | 'circles-all' | 'circles-own' | 'circles-opponent';
  pieceColors?: 'normal' | 'white-only' | 'black-only';

  // Coordinates
  showCoordinates?: boolean;
  showFileCoordinate?: boolean;
  showRankCoordinate?: boolean;

  // Interaction
  onClick?: () => void;

  // Highlight
  highlightType?: 'none' | 'last-move' | 'selectable';

  // Layout
  layoutMode?: 'flex' | 'grid';
};

export function Square({
  file,
  rank,
  isLight,
  piece,
  hidden = false,
  playerSide = 'white',
  showOwnPieces = true,
  showOpponentPieces = true,
  pieceShapeMode = 'normal',
  pieceColors = 'normal',
  showCoordinates = false,
  showFileCoordinate = false,
  showRankCoordinate = false,
  onClick,
  highlightType = 'none',
  layoutMode = 'flex',
}: Props) {
  const renderPiece = () => {
    if (!piece || hidden) return null;

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

  const squareColorClass = isLight
    ? 'bg-stone-200 dark:bg-stone-300'
    : 'bg-stone-600 dark:bg-stone-700';

  const highlightClass =
    highlightType === 'last-move'
      ? 'ring-2 ring-yellow-400 ring-inset'
      : highlightType === 'selectable'
        ? 'ring-2 ring-green-400 ring-inset'
        : '';

  const coordinateColorClass = isLight
    ? 'text-stone-700 dark:text-stone-800'
    : 'text-stone-300 dark:text-stone-200';

  const sizeClass = layoutMode === 'grid' ? 'aspect-square' : 'w-[12.5%] h-full';

  return (
    <div
      className={`
        ${sizeClass} relative flex items-center justify-center
        ${squareColorClass}
        ${highlightClass}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${layoutMode === 'grid' ? 'transition-colors select-none' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-full h-full">{renderPiece()}</div>

      {/* Coordinates */}
      {showCoordinates && showRankCoordinate && (
        <div
          className={`absolute left-0.5 top-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
        >
          {rank}
        </div>
      )}
      {showCoordinates && showFileCoordinate && (
        <div
          className={`absolute right-0.5 bottom-0.5 text-[0.6rem] sm:text-xs font-semibold pointer-events-none ${coordinateColorClass}`}
        >
          {file}
        </div>
      )}
    </div>
  );
}
