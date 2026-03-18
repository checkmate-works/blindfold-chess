'use client';

import { useTranslations } from 'next-intl';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { FaQuestion } from 'react-icons/fa';

import type { PieceType } from '../_lib/types';

export type PieceSelection = PieceType | 'random';

type Props = {
  selected: PieceSelection;
  onSelect: (selection: PieceSelection) => void;
};

export function PieceSelector({ selected, onSelect }: Props) {
  const t = useTranslations('practice.legalMoves');
  const pieces: PieceType[] = ['k', 'q', 'r', 'b', 'n'];

  const options: { value: PieceSelection; label: string }[] = [
    ...pieces.map((piece) => ({
      value: piece as PieceSelection,
      label: t(`pieces.${piece}`),
    })),
    { value: 'random' as PieceSelection, label: t('pieces.random') },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center gap-1 sm:gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
              selected === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            }`}
            aria-label={option.label}
            title={option.label}
          >
            {option.value === 'random' ? (
              <FaQuestion className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ChessPiece type={option.value} color="w" size={24} />
            )}
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground animate-in fade-in duration-300">
        {selected === 'random' ? t('pieces.random') : t(`pieces.${selected}`)}
      </div>
    </div>
  );
}
