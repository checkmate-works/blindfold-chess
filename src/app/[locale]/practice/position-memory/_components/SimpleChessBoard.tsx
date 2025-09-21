'use client';

import { useState, useEffect } from 'react';
import { ChessPieces } from '../../_components/ChessBoard';

interface SimpleChessBoardProps {
  fen: string;
  onFenChange: (fen: string) => void;
  flipped?: boolean;
  editable?: boolean;
  preserveTurnInfo?: boolean; // Whether to preserve turn info from original position
  originalPosition?: string; // Original position to preserve turn info from
  translations?: {
    blackPieces: string;
    whitePieces: string;
    removePieceMode: string;
    placingPiece: string;
  };
}

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | 'P' | 'R' | 'N' | 'B' | 'Q' | 'K' | '';

const WHITE_PIECES: PieceType[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
const BLACK_PIECES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];

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

// Helper function to convert board array to FEN
function boardToFen(
  board: PieceType[],
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

// Helper function to render piece using SVG
const renderPiece = (piece: PieceType) => {
  if (!piece) return null;

  // Determine color: uppercase = white, lowercase = black
  const isWhite = piece === piece.toUpperCase();
  const color = isWhite ? 'w' : 'b';
  const type = piece.toLowerCase().toUpperCase(); // Convert to uppercase for key

  // Create the correct key: color + uppercase type (e.g., 'wP', 'bK')
  const pieceKey = `${color}${type}` as keyof typeof ChessPieces;
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

export function SimpleChessBoard({
  fen,
  onFenChange,
  flipped = false,
  editable = false,
  preserveTurnInfo = false,
  originalPosition,
  translations = {
    blackPieces: 'Black Pieces',
    whitePieces: 'White Pieces',
    removePieceMode: 'Remove piece mode - Click on a square to remove piece',
    placingPiece: 'Placing',
  },
}: SimpleChessBoardProps) {
  const [board, setBoard] = useState<PieceType[]>(() => fenToBoard(fen));
  const [selectedPiece, setSelectedPiece] = useState<PieceType>('');

  useEffect(() => {
    setBoard(fenToBoard(fen));
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

  const getSquareColor = (squareIndex: number) => {
    const rank = Math.floor(squareIndex / 8);
    const file = squareIndex % 8;
    return (rank + file) % 2 === 0
      ? 'bg-stone-200 dark:bg-stone-300'
      : 'bg-stone-600 dark:bg-stone-700';
  };

  // Determine palette order based on board orientation
  const topPalette = flipped
    ? { pieces: WHITE_PIECES, label: translations.whitePieces }
    : { pieces: BLACK_PIECES, label: translations.blackPieces };

  const bottomPalette = flipped
    ? { pieces: BLACK_PIECES, label: translations.blackPieces }
    : { pieces: WHITE_PIECES, label: translations.whitePieces };

  const renderPalette = (pieces: PieceType[], title: string) => (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="flex gap-1 sm:gap-2 p-2 sm:p-3 bg-secondary rounded-lg">
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
          const color = isWhite ? 'w' : 'b';
          const type = piece.toLowerCase().toUpperCase();
          const pieceKey = `${color}${type}` as keyof typeof ChessPieces;
          const PieceComponent = ChessPieces[pieceKey];

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
              {PieceComponent && (
                <div className="w-full h-full flex items-center justify-center p-1">
                  <PieceComponent size={32} />
                </div>
              )}
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

              return (
                <div
                  key={squareIndex}
                  className={`
                    aspect-square flex items-center justify-center cursor-pointer
                    transition-colors select-none hover:opacity-80
                    ${getSquareColor(squareIndex)}
                  `}
                  onClick={() => handleSquareClick(displayIndex)}
                >
                  {renderPiece(displayPiece)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current mode indicator */}
      {editable && (
        <p className="text-sm text-muted-foreground text-center">
          {selectedPiece === ''
            ? translations.removePieceMode
            : selectedPiece
              ? `${translations.placingPiece} ${selectedPiece.toUpperCase()}`
              : 'Select a piece above'}
        </p>
      )}

      {/* Bottom palette */}
      {editable && renderPalette(bottomPalette.pieces, bottomPalette.label)}
    </div>
  );
}
