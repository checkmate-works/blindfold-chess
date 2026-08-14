import { ChessPiece, Square } from '@/app/_components';
import type { Color } from '@blindfold-chess/features/chess-core';
import { fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';
import { DISPLAY_RANKS, FILES, isLightSquare } from '@blindfold-chess/features/common';
import type { SquareDiff } from '@blindfold-chess/features/common';
import type { PieceType } from '@blindfold-chess/types';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';

import { deriveSquareCell } from './board-square-layout';
import type { FenPieceChar } from './types';

type Props = {
  fen: string;
  flipped?: boolean;
  squareDifferences?: SquareDiff[];
  boardTheme?: BoardTheme;
  showCoordinates?: boolean;
};

export function ChessBoardWithOverlay({
  fen,
  flipped = false,
  squareDifferences = [],
  boardTheme = DEFAULT_BOARD_THEME,
  showCoordinates = true,
}: Props) {
  const board = fenToBoardFlat(fen) as FenPieceChar[];
  const themeColors = getBoardThemeColors(boardTheme);

  const getFileRank = (squareIndex: number) => {
    const file = FILES[squareIndex % 8];
    const rank = DISPLAY_RANKS[Math.floor(squareIndex / 8)];
    return { file, rank };
  };

  const getSquareStatus = (file: string, rank: string) => {
    const square = file + rank;
    const diff = squareDifferences.find((d) => d.square === square);
    return diff?.status;
  };

  const renderPiece = (piece: FenPieceChar) => {
    if (!piece) return null;

    const isWhite = piece === piece.toUpperCase();
    const color: Color = (isWhite ? 'w' : 'b') as Color;
    const type: PieceType = piece.toLowerCase() as PieceType;

    return (
      <div className="w-[80%] h-[80%] flex items-center justify-center">
        <ChessPiece type={type} color={color} size={45} />
      </div>
    );
  };

  const getOverlayStyle = (status?: string) => {
    switch (status) {
      case 'correct':
        return 'bg-green-500/40';
      case 'incorrect':
        return 'bg-red-500/50';
      case 'missing':
        return 'bg-yellow-500/40';
      default:
        return '';
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="relative w-full aspect-square rounded-md overflow-hidden">
        <div className="grid grid-cols-8 gap-0 w-full h-full">
          {board.map((piece, squareIndex) => {
            const {
              displayIndex,
              gridFile,
              gridRank,
              file,
              rank,
              showRankCoordinate,
              showFileCoordinate,
            } = deriveSquareCell(squareIndex, flipped);
            const displayPiece = board[displayIndex];
            const isLight = isLightSquare(gridFile, gridRank);

            // IMPORTANT: Overlay must match the PIECE being displayed, not the square label
            // The piece comes from displayIndex, so we get its actual square coordinates
            const pieceSquare = getFileRank(displayIndex);
            const status = getSquareStatus(pieceSquare.file, pieceSquare.rank);

            return (
              <div key={squareIndex} className="relative">
                <Square
                  file={file}
                  rank={rank}
                  isLight={isLight}
                  showCoordinates={showCoordinates}
                  showRankCoordinate={showRankCoordinate}
                  showFileCoordinate={showFileCoordinate}
                  layoutMode="grid"
                  themeColors={themeColors}
                >
                  {renderPiece(displayPiece)}
                </Square>
                {status && (
                  <div
                    className={`absolute inset-0 pointer-events-none ${getOverlayStyle(status)}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
