'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

type Props = {
  onSubmit: (square: string) => void;
  availableMoves: string[];
  disabled?: boolean;
  placeholder?: string;
};

export function SquareSelect({ onSubmit, availableMoves, disabled = false, placeholder }: Props) {
  const t = useTranslations('practice.knightTour');
  const [selectedMove, setSelectedMove] = useState('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const move = e.target.value;
    setSelectedMove(move);

    // Auto-submit on selection
    if (move && !disabled) {
      onSubmit(move);
      setSelectedMove('');
    }
  };

  // Sort moves alphabetically for consistent display
  const sortedMoves = [...availableMoves].sort();

  return (
    <form className="flex gap-2">
      <select
        value={selectedMove}
        onChange={handleSelectChange}
        disabled={disabled || availableMoves.length === 0}
        className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {availableMoves.length === 0 ? t('noMovesAvailable') : placeholder || t('selectSquare')}
        </option>
        {sortedMoves.map((move) => (
          <option key={move} value={move}>
            {move}
          </option>
        ))}
      </select>
    </form>
  );
}
