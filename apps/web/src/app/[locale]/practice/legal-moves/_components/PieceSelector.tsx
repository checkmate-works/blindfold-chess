'use client';

import { useTranslations } from 'next-intl';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';

import type { PieceType } from '../_lib/types';

type Props = {
  selectedPieces: Record<PieceType, boolean>;
  onPieceToggle: (piece: PieceType) => void;
};

export function PieceSelector({ selectedPieces, onPieceToggle }: Props) {
  const t = useTranslations('practice.legalMoves');
  const pieces: PieceType[] = ['k', 'q', 'r', 'b', 'n'];
  const selectedCount = pieces.filter((piece) => selectedPieces[piece]).length;

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center gap-2">
        {pieces.map((piece) => (
          <button
            key={piece}
            onClick={() => onPieceToggle(piece)}
            className={`w-12 h-12 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
              selectedPieces[piece]
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            }`}
            aria-label={t(`pieces.${piece}`)}
            title={t(`pieces.${piece}`)}
          >
            <ChessPiece type={piece} color="w" size={28} />
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground animate-in fade-in duration-300">
        {t('selectedCount', { count: selectedCount })}
      </div>
    </div>
  );
}
