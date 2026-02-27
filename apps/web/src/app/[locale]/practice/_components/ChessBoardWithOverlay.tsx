import { ChessPiece, Square } from '@/app/_components';
import type { Color, PieceSymbol } from '@blindfold-chess/features/chess-core';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

import type { SquareDiff } from '../_lib/types';

type Props = {
  fen: string;
  flipped?: boolean;
  squareDifferences?: SquareDiff[];
  boardTheme?: BoardTheme;
  showCoordinates?: boolean;
};

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | 'P' | 'R' | 'N' | 'B' | 'Q' | 'K' | '';

// Helper function to convert FEN to board array
function fenToBoard(fen: string): PieceType[] {
  const pieces = fen.split(' ')[0]; // Get piece placement part
  const board: PieceType[] = new Array(64).fill('');
  let squareIndex = 0;

  for (const char of pieces) {
    if (char === '/') {
      continue; // Skip rank separator
    } else if (/\d/.test(char)) {
      // Empty squares
      const emptySquares = parseInt(char);
      squareIndex += emptySquares;
    } else {
      // Piece
      board[squareIndex] = char as PieceType;
      squareIndex++;
    }
  }

  return board;
}

export function ChessBoardWithOverlay({
  fen,
  flipped = false,
  squareDifferences = [],
  boardTheme = DEFAULT_BOARD_THEME,
  showCoordinates = true,
}: Props) {
  const board = fenToBoard(fen);
  const themeColors = getBoardThemeColors(boardTheme);

  const isLightSquare = (squareIndex: number) => {
    const rank = Math.floor(squareIndex / 8);
    const file = squareIndex % 8;
    return (rank + file) % 2 === 0;
  };

  const getFileRank = (squareIndex: number) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const file = files[squareIndex % 8];
    const rank = ranks[Math.floor(squareIndex / 8)];
    return { file, rank };
  };

  const getSquareStatus = (file: string, rank: string) => {
    const square = file + rank;
    const diff = squareDifferences.find((d) => d.square === square);
    return diff?.status;
  };

  const renderPiece = (piece: PieceType) => {
    if (!piece) return null;

    const isWhite = piece === piece.toUpperCase();
    const color: Color = (isWhite ? 'w' : 'b') as Color;
    const type: PieceSymbol = piece.toLowerCase() as PieceSymbol;

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
      <div className="relative w-full aspect-square border border-border rounded-md shadow-lg overflow-hidden">
        <div className="grid grid-cols-8 gap-0 w-full h-full">
          {board.map((piece, squareIndex) => {
            // Handle board flipping for black side
            const displayIndex = flipped ? 63 - squareIndex : squareIndex;
            const displayPiece = board[displayIndex];
            const isLight = isLightSquare(squareIndex);

            // Grid position for coordinate display
            const gridFile = squareIndex % 8;
            const gridRank = Math.floor(squareIndex / 8);

            // Files and ranks arrays (same as ChessBoard)
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

            // Display files/ranks (reversed when flipped, like ChessBoard)
            const displayFiles = flipped ? [...files].reverse() : files;
            const displayRanks = flipped ? [...ranks].reverse() : ranks;

            // Get file/rank for this grid position
            const file = displayFiles[gridFile];
            const rank = displayRanks[gridRank];

            // Show rank on left edge, file on bottom edge (always, like ChessBoard)
            const showRankCoordinate = gridFile === 0;
            const showFileCoordinate = gridRank === 7;

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
