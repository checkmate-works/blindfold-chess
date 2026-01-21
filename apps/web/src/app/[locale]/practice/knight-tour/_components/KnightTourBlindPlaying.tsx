'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaKeyboard, FaList, FaUndo } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import { SquareInput } from './SquareInput';
import { SquareSelect } from './SquareSelect';

type Props = {
  currentSquare: string;
  visitedSquares: Map<string, number>;
  availableMoves: string[];
  moveCount: number;
  onSquareClick: (square: string) => void;
  onUndo: () => void;
  onQuit: () => void;
  canUndo: boolean;
};

export function KnightTourBlindPlaying({
  currentSquare,
  visitedSquares,
  availableMoves,
  moveCount,
  onSquareClick,
  onUndo,
  onQuit,
  canUndo,
}: Props) {
  const t = useTranslations('practice.knightTour');
  const tPractice = useTranslations('practice');
  const tPlay = useTranslations('play');
  const { preferences, updatePreferences } = useGamePreferences();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get move history as array of squares
  const moveHistory = Array.from(visitedSquares.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([square, num]) => ({ square, num }));

  // Valid chess squares
  const isValidSquare = (square: string): boolean => {
    const file = square[0];
    const rank = square[1];
    return square.length === 2 && file >= 'a' && file <= 'h' && rank >= '1' && rank <= '8';
  };

  const handleSubmit = (square: string) => {
    // Clear any previous error
    setError(null);

    // Check if it's a valid square format
    if (!isValidSquare(square)) {
      setError(t('invalidSquareFormat'));
      return;
    }

    // Check if already visited
    if (visitedSquares.has(square)) {
      setError(t('alreadyVisited'));
      return;
    }

    // Check if it's a legal knight move
    if (!availableMoves.includes(square)) {
      setError(tPlay('invalidMove'));
      return;
    }

    // Valid move
    onSquareClick(square);
    setInputValue('');
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Progress */}
          <ProgressBar current={moveCount} total={64} />

          {/* Current Position */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">{t('currentPosition')}</p>
            <p className="text-5xl font-bold text-foreground font-mono">{currentSquare}</p>
          </div>

          {/* Move Input */}
          {availableMoves.length > 0 ? (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {t('availableMoves')}
                </h3>
                {preferences.moveInputMode === 'select' ? (
                  <SquareSelect
                    onSubmit={handleSubmit}
                    availableMoves={availableMoves}
                    disabled={false}
                  />
                ) : (
                  <>
                    <SquareInput
                      value={inputValue}
                      onChange={handleInputChange}
                      onSubmit={handleSubmit}
                      availableMoves={availableMoves}
                      disabled={false}
                      showSuggestions={preferences.enableAutoComplete}
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                  </>
                )}
              </div>

              {/* Toggle Input Mode */}
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    updatePreferences({
                      moveInputMode: preferences.moveInputMode === 'text' ? 'select' : 'text',
                    })
                  }
                  className="p-2 border border-border rounded-md hover:bg-muted"
                  title={
                    preferences.moveInputMode === 'text' ? t('switchToSelect') : t('switchToText')
                  }
                >
                  {preferences.moveInputMode === 'text' ? (
                    <FaList className="w-4 h-4" />
                  ) : (
                    <FaKeyboard className="w-4 h-4" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-center">
              <p className="text-destructive font-medium">{t('stuck')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('stuckHint')}</p>
            </div>
          )}

          {/* Move History */}
          {moveHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('moveHistory')}</h3>
              <div className="max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {moveHistory.map(({ square, num }) => (
                    <span
                      key={square}
                      className="inline-flex items-center px-2 py-1 text-xs font-mono bg-muted rounded"
                    >
                      <span className="text-muted-foreground mr-1">{num}.</span>
                      <span className="font-bold">N{square}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              onClick={onUndo}
              variant="secondary"
              size="md"
              icon={<FaUndo />}
              disabled={!canUndo}
              className="flex-1"
            >
              {t('undo')}
            </Button>
            <Button onClick={onQuit} variant="destructive" size="md" className="flex-1">
              {tPractice('quit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
