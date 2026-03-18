'use client';

import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import type { PieceType } from '@blindfold-chess/types';
import { FaQuestion } from 'react-icons/fa';

export type PieceSelection = PieceType | 'random';

const PIECE_OPTIONS: PieceType[] = ['k', 'q', 'r', 'b', 'n'];

type Props = {
  selected: PieceSelection;
  onSelect: (selection: PieceSelection) => void;
  getLabel: (selection: PieceSelection) => string;
  showLabel?: boolean;
};

export function PieceSelector({ selected, onSelect, getLabel, showLabel = false }: Props) {
  const options: PieceSelection[] = [...PIECE_OPTIONS, 'random'];

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center gap-1 sm:gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-md font-bold text-lg transition-colors border ${
              selected === option
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            }`}
            aria-label={getLabel(option)}
            title={getLabel(option)}
          >
            {option === 'random' ? (
              <FaQuestion className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ChessPiece type={option} color="w" size={24} />
            )}
          </button>
        ))}
      </div>
      {showLabel && (
        <div className="mt-2 text-xs text-muted-foreground animate-in fade-in duration-300">
          {getLabel(selected)}
        </div>
      )}
    </div>
  );
}
