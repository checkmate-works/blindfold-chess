'use client';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { PieceType } from '@blindfold-chess/types';

const PIECES = ['K', 'Q', 'R', 'B', 'N'];

type Props = {
  selectedPiece: string | null;
  playerColor: 'w' | 'b';
  pieceLabel: 'icon' | 'text';
  onPieceClick: (piece: string) => void;
};

export function PieceSelector({ selectedPiece, playerColor, pieceLabel, onPieceClick }: Props) {
  return (
    <div className="flex gap-2 justify-center">
      {PIECES.map((piece) => (
        <button
          key={piece}
          onClick={() => onPieceClick(piece)}
          aria-label={piece}
          className={`w-9 h-9 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
            selectedPiece === piece
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border'
          }`}
        >
          {pieceLabel === 'icon' ? (
            <ChessPiece type={piece.toLowerCase() as PieceType} color={playerColor} size={24} />
          ) : (
            piece
          )}
        </button>
      ))}
    </div>
  );
}
