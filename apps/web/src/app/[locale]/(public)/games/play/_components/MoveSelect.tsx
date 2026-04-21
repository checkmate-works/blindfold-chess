'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { getLegalMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaChevronDown } from 'react-icons/fa';

import { sortMoves } from '../_lib';

type Props = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  onChange?: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function MoveSelect({ fen, onSubmit, onChange, disabled, placeholder }: Props) {
  const [selectedMove, setSelectedMove] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate legal moves from FEN (derived state)
  const legalMoves = useMemo(() => {
    try {
      const moves = getLegalMoves(fen);
      return sortMoves(moves);
    } catch (error) {
      console.error('Error calculating legal moves:', error);
      return [];
    }
  }, [fen]);

  // Reset selection when FEN changes
  useEffect(() => {
    setSelectedMove('');
    setIsOpen(false);
  }, [fen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (move: string) => {
    setSelectedMove(move);
    setIsOpen(false);

    // Call onChange callback if provided
    if (onChange) {
      onChange();
    }

    // Auto-submit on selection
    if (move && !disabled) {
      onSubmit(move as AlgebraicNotation);
      setSelectedMove('');
    }
  };

  const toggleOpen = () => {
    if (!disabled && legalMoves.length > 0) {
      setIsOpen(!isOpen);
    }
  };

  const isDisabled = disabled || legalMoves.length === 0;

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={toggleOpen}
        disabled={isDisabled}
        className={`w-full flex items-center justify-between px-4 py-3.5 md:py-3 border border-border rounded-lg bg-background text-lg md:text-base text-left focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
        } ${isOpen ? 'ring-2 ring-ring border-ring' : ''}`}
      >
        <span className={!selectedMove ? 'text-muted-foreground' : 'text-foreground'}>
          {selectedMove ||
            (legalMoves.length === 0
              ? 'No legal moves available'
              : placeholder || 'Select a move...')}
        </span>
        <FaChevronDown
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto w-full">
          {legalMoves.map((move) => (
            <button
              key={move}
              type="button"
              onClick={() => handleSelect(move)}
              className="w-full px-4 py-4 md:py-2 text-left font-mono text-lg md:text-base text-foreground hover:bg-muted transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg focus:outline-none focus:bg-muted"
            >
              {move}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
