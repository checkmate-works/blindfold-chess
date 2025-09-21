'use client';

import { pieceDisplayMap, type PieceType } from '../_lib/legal-moves';

interface PieceSelectorProps {
  selectedPieces: Record<PieceType, boolean>;
  onPieceToggle: (piece: PieceType) => void;
  translations: {
    pieces: {
      bishop: string;
      knight: string;
      rook: string;
      queen: string;
      king: string;
    };
  };
}

export function PieceSelector({ selectedPieces, onPieceToggle, translations }: PieceSelectorProps) {
  const pieces: PieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {pieces.map((piece) => (
        <button
          key={piece}
          onClick={() => onPieceToggle(piece)}
          className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl transition-all ${
            selectedPieces[piece]
              ? 'bg-foreground text-background shadow-lg scale-105'
              : 'bg-secondary hover:bg-muted border-2 border-border'
          }`}
          aria-label={translations.pieces[piece]}
          title={translations.pieces[piece]}
        >
          <span className="text-2xl sm:text-3xl">{pieceDisplayMap[piece]}</span>
          <span className="text-[10px] sm:text-xs mt-1 font-medium">
            {translations.pieces[piece]}
          </span>
        </button>
      ))}
    </div>
  );
}
