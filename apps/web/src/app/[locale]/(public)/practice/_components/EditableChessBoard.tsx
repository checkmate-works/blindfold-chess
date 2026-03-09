'use client';

import { useEffect, useState } from 'react';

import { ChessPiece, Square } from '@/app/_components';
import type { Color } from '@blindfold-chess/features/chess-core';
import { fenToBoardFlat } from '@blindfold-chess/features/chess-core';
import { DISPLAY_RANKS, FILES, isLightSquare } from '@blindfold-chess/features/common';
import type { PieceType } from '@blindfold-chess/types';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/boardThemes';

export type EditableChessBoardLabels = {
  whitePieces: string;
  blackPieces: string;
  removePieceMode: string;
  placingPiece: string;
};

type Props = {
  fen: string;
  onFenChange: (fen: string) => void;
  labels: EditableChessBoardLabels;
  flipped?: boolean;
  editable?: boolean;
  preserveTurnInfo?: boolean; // Whether to preserve turn info from original position
  originalPosition?: string; // Original position to preserve turn info from
  boardTheme?: BoardTheme;
  showCoordinates?: boolean;
};

type FenPieceChar = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | 'P' | 'R' | 'N' | 'B' | 'Q' | 'K' | '';

const WHITE_PIECES: FenPieceChar[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
const BLACK_PIECES: FenPieceChar[] = ['k', 'q', 'r', 'b', 'n', 'p'];

// Helper function to convert board array to FEN
function boardToFen(
  board: FenPieceChar[],
  preserveTurnInfo?: boolean,
  originalPosition?: string
): string {
  let fen = '';

  for (let rank = 0; rank < 8; rank++) {
    let emptyCount = 0;
    let rankFen = '';

    for (let file = 0; file < 8; file++) {
      const squareIndex = rank * 8 + file;
      const piece = board[squareIndex];

      if (piece === '') {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankFen += emptyCount;
          emptyCount = 0;
        }
        rankFen += piece;
      }
    }

    if (emptyCount > 0) {
      rankFen += emptyCount;
    }

    fen += rankFen;
    if (rank < 7) {
      fen += '/';
    }
  }

  // If preserveTurnInfo is enabled, extract and preserve the game state info from original position
  if (preserveTurnInfo && originalPosition) {
    const parts = originalPosition.split(' ');
    if (parts.length >= 6) {
      // Preserve turn, castling, en passant, halfmove, and fullmove from original position
      const gameStateInfo = parts.slice(1).join(' ');
      return fen + ' ' + gameStateInfo;
    }
  }

  return fen + ' w - - 0 1';
}

export function EditableChessBoard({
  fen,
  onFenChange,
  labels,
  flipped = false,
  editable = false,
  preserveTurnInfo = false,
  originalPosition,
  boardTheme = DEFAULT_BOARD_THEME,
  showCoordinates = true,
}: Props) {
  const [board, setBoard] = useState<FenPieceChar[]>(() => fenToBoardFlat(fen) as FenPieceChar[]);
  const [selectedPiece, setSelectedPiece] = useState<FenPieceChar>('');
  const themeColors = getBoardThemeColors(boardTheme);

  useEffect(() => {
    setBoard(fenToBoardFlat(fen) as FenPieceChar[]);
  }, [fen]);

  const handleSquareClick = (squareIndex: number) => {
    if (!editable) return;

    const newBoard = [...board];
    const currentPiece = newBoard[squareIndex];

    if (selectedPiece === '') {
      // Remove piece mode
      newBoard[squareIndex] = '';
    } else {
      // Place piece mode - toggle if same piece
      // Use trim and explicit string comparison to ensure matching
      const currentPieceStr = String(currentPiece || '').trim();
      const selectedPieceStr = String(selectedPiece).trim();

      if (currentPieceStr !== '' && currentPieceStr === selectedPieceStr) {
        // Toggle off if clicking the same piece
        newBoard[squareIndex] = '';
      } else {
        // Place the piece
        newBoard[squareIndex] = selectedPiece;
      }
    }

    setBoard(newBoard);
    const newFen = boardToFen(newBoard, preserveTurnInfo, originalPosition);
    onFenChange(newFen);
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

  // Determine palette order based on board orientation
  const topPalette = flipped
    ? { pieces: WHITE_PIECES, label: labels.whitePieces }
    : { pieces: BLACK_PIECES, label: labels.blackPieces };

  const bottomPalette = flipped
    ? { pieces: BLACK_PIECES, label: labels.blackPieces }
    : { pieces: WHITE_PIECES, label: labels.whitePieces };

  const displayFiles = flipped ? [...FILES].reverse() : [...FILES];
  const displayRanks = flipped ? [...DISPLAY_RANKS].reverse() : [...DISPLAY_RANKS];

  const renderPalette = (pieces: FenPieceChar[], title: string) => (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="flex gap-1 sm:gap-2 p-2 sm:p-3 border border-border rounded-lg">
        <button
          onClick={() => setSelectedPiece('')}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded border-2 flex items-center justify-center text-base sm:text-lg flex-shrink-0 transition-colors ${
            selectedPiece === ''
              ? 'border-foreground bg-foreground/10 scale-105'
              : 'border-border hover:bg-muted'
          }`}
          title="Remove piece"
        >
          ×
        </button>
        {pieces.map((piece) => {
          const isWhite = piece === piece.toUpperCase();
          const color: Color = (isWhite ? 'w' : 'b') as Color;
          const type: PieceType = piece.toLowerCase() as PieceType;

          return (
            <button
              key={piece}
              onClick={() => setSelectedPiece(piece)}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                selectedPiece === piece
                  ? 'border-foreground bg-foreground/10 scale-105'
                  : 'border-border hover:bg-muted'
              }`}
              title={`Place ${piece.toUpperCase() === piece ? 'White' : 'Black'} ${piece.toUpperCase()}`}
            >
              <div className="w-full h-full flex items-center justify-center p-1">
                <ChessPiece type={type} color={color} size={32} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Top palette */}
      {editable && renderPalette(topPalette.pieces, topPalette.label)}

      {/* Chess board */}
      <div className="w-full max-w-md">
        <div className="relative w-full aspect-square border border-border rounded-md shadow-lg overflow-hidden">
          <div className="grid grid-cols-8 gap-0 w-full h-full">
            {board.map((piece, squareIndex) => {
              // Handle board flipping for black side
              const displayIndex = flipped ? 63 - squareIndex : squareIndex;
              const displayPiece = board[displayIndex];
              const isLight = isLightSquare(squareIndex % 8, Math.floor(squareIndex / 8));

              // Grid position for coordinate display
              const gridFile = squareIndex % 8;
              const gridRank = Math.floor(squareIndex / 8);

              // Get file/rank for this grid position
              const file = displayFiles[gridFile];
              const rank = displayRanks[gridRank];

              // Show rank on left edge, file on bottom edge (always, like ChessBoard)
              const showRankCoordinate = gridFile === 0;
              const showFileCoordinate = gridRank === 7;

              return (
                <Square
                  key={squareIndex}
                  file={file}
                  rank={rank}
                  isLight={isLight}
                  showCoordinates={showCoordinates}
                  showRankCoordinate={showRankCoordinate}
                  showFileCoordinate={showFileCoordinate}
                  onClick={() => handleSquareClick(displayIndex)}
                  layoutMode="grid"
                  themeColors={themeColors}
                >
                  {renderPiece(displayPiece)}
                </Square>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current mode indicator */}
      {editable && (
        <p className="text-sm text-muted-foreground text-center">
          {selectedPiece === ''
            ? labels.removePieceMode
            : selectedPiece
              ? `${labels.placingPiece} ${selectedPiece.toUpperCase()}`
              : 'Select a piece above'}
        </p>
      )}

      {/* Bottom palette */}
      {editable && renderPalette(bottomPalette.pieces, bottomPalette.label)}
    </div>
  );
}
