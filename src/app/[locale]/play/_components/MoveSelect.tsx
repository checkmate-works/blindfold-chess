'use client';

import { useEffect, useState } from 'react';

import { Chess } from 'chess.js';

import type { AlgebraicNotation } from '@/lib/types';

type Props = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  onChange?: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function MoveSelect({ fen, onSubmit, onChange, disabled, placeholder }: Props) {
  const [selectedMove, setSelectedMove] = useState('');
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  useEffect(() => {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: false });
      // Sort moves for better usability
      const sortedMoves = moves.sort((a, b) => {
        // Prioritize captures
        if (a.includes('x') && !b.includes('x')) return -1;
        if (!a.includes('x') && b.includes('x')) return 1;
        // Then checks
        if (a.includes('+') && !b.includes('+')) return -1;
        if (!a.includes('+') && b.includes('+')) return 1;
        // Then alphabetically
        return a.localeCompare(b);
      });
      setLegalMoves(sortedMoves);
      setSelectedMove(''); // Reset selection when FEN changes
    } catch (error) {
      console.error('Error calculating legal moves:', error);
      setLegalMoves([]);
    }
  }, [fen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMove && !disabled) {
      onSubmit(selectedMove as AlgebraicNotation);
      setSelectedMove('');
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const move = e.target.value;
    setSelectedMove(move);

    // Call onChange callback if provided (e.g., to clear errors)
    if (onChange) {
      onChange();
    }

    // Auto-submit on selection
    if (move && !disabled) {
      onSubmit(move as AlgebraicNotation);
      setSelectedMove('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <select
        value={selectedMove}
        onChange={handleSelectChange}
        disabled={disabled || legalMoves.length === 0}
        className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {legalMoves.length === 0 ? 'No legal moves available' : placeholder || 'Select a move...'}
        </option>
        {legalMoves.map((move) => (
          <option key={move} value={move}>
            {move}
          </option>
        ))}
      </select>
    </form>
  );
}
