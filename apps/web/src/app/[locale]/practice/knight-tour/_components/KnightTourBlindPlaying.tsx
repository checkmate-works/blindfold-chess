'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaCog, FaUndo } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import { ControlSettingsModal } from './ControlSettingsModal';
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
  const tPreferences = useTranslations('Preferences');
  const { preferences, updatePreferences } = useGamePreferences();
  const [inputValue, setInputValue] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
      {/* Progress */}
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('progress')}</h3>
        <ProgressBar current={moveCount} total={64} />
      </div>

      {/* Current Position */}
      <div className="bg-card rounded-md shadow-sm border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">{t('currentPosition')}</p>
        <p className="text-5xl font-bold text-foreground font-mono">{currentSquare}</p>
      </div>

      {/* Move Input */}
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('availableMoves')}</h3>

        {availableMoves.length > 0 ? (
          preferences.moveInputMode === 'select' ? (
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
              {/* Error message */}
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              {/* Autocomplete checkbox */}
              <label className="flex items-center mt-3">
                <input
                  type="checkbox"
                  checked={preferences.enableAutoComplete}
                  onChange={(e) => updatePreferences({ enableAutoComplete: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {tPreferences('controls.enableAutoComplete')}
                </span>
              </label>
            </>
          )
        ) : (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-center">
            <p className="text-destructive font-medium">{t('stuck')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('stuckHint')}</p>
          </div>
        )}

        {/* Settings link */}
        <div className="mt-3 text-center">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <FaCog className="w-3 h-3" />
            {t('inputSettings')}
          </button>
        </div>
      </div>

      {/* Move History */}
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('moveHistory')}</h3>
        <div className="max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {moveHistory.map(({ square, num }) => (
              <span
                key={square}
                className="inline-flex items-center px-2 py-1 text-xs font-mono bg-muted rounded"
              >
                <span className="text-muted-foreground mr-1">{num}.</span>
                <span className="font-bold">{square}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

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
        <Button onClick={onQuit} variant="secondary" size="md" className="flex-1">
          {tPractice('quit')}
        </Button>
      </div>

      {/* Control Settings Modal */}
      <ControlSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
