'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLegalMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaGamepad, FaKeyboard, FaList } from 'react-icons/fa';

import type { MoveInputMethod } from '@/lib/types';

import { ButtonInput } from '@/app/[locale]/(public)/games/play/_components/ButtonInput';
import { MoveInput } from '@/app/[locale]/(public)/games/play/_components/MoveInput';
import { MoveSelect } from '@/app/[locale]/(public)/games/play/_components/MoveSelect';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

const INVALID_ATTEMPTS_THRESHOLD = 3;

type Props = {
  preferences: GamePreferences;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  currentFen: string;
  moveInput: string;
  onMoveInputChange: (value: string) => void;
  error: string | null;
  onErrorClear: () => void;
  onSubmit: (move: AlgebraicNotation) => boolean | void | Promise<void>;
  disabled?: boolean;
  inputPlaceholder?: string;
  selectPlaceholder?: string;
  toggleTitle?: string;
  playerColor?: 'w' | 'b';
  onMoveCommitted?: (inputMethod: MoveInputMethod) => void;
  onMovePeek?: () => void;
};

const modeIcons: Record<GamePreferences['moveInputMode'], ReactNode> = {
  text: <FaKeyboard className="w-4 h-4" />,
  select: <FaList className="w-4 h-4" />,
  button: <FaGamepad className="w-4 h-4" />,
};

export function MoveInputPanel({
  preferences,
  updatePreferences,
  currentFen,
  moveInput,
  onMoveInputChange,
  error,
  onErrorClear,
  onSubmit,
  disabled = false,
  inputPlaceholder,
  selectPlaceholder,
  toggleTitle,
  playerColor,
  onMoveCommitted,
  onMovePeek,
}: Props) {
  const t = useTranslations('play');
  const enabledModes = preferences.enabledMoveInputModes;

  // Track consecutive invalid move attempts to offer legal moves hint.
  // Counting is done directly in the submit wrapper (not via useEffect on error),
  // so it reliably increments even when the same invalid move is submitted repeatedly.
  const [invalidAttemptCount, setInvalidAttemptCount] = useState(0);
  const [showLegalMoves, setShowLegalMoves] = useState(false);

  const handleShowLegalMoves = () => {
    setShowLegalMoves(true);
    setInvalidAttemptCount(0);
    onMovePeek?.();
  };

  /**
   * Wrap onSubmit to track valid/invalid submissions.
   * - On valid move (returns true or void/Promise): reset counter, commit log
   * - On invalid move (returns false): increment counter
   */
  const handleSubmitWithTracking = (move: AlgebraicNotation, inputMethod: MoveInputMethod) => {
    const result = onSubmit(move);
    if (result === false) {
      setInvalidAttemptCount((prev) => prev + 1);
    } else {
      setInvalidAttemptCount(0);
      setShowLegalMoves(false);
      onMoveCommitted?.(inputMethod);
    }
  };

  // Defensive: if current mode is not in enabled list, fall back to first enabled mode
  const currentMode = enabledModes.includes(preferences.moveInputMode)
    ? preferences.moveInputMode
    : enabledModes[0];

  // Reset legal moves display and invalid attempt counter when input mode changes
  useEffect(() => {
    setShowLegalMoves(false);
    setInvalidAttemptCount(0);
  }, [currentMode]);

  // Compute next mode for cycling
  const currentIndex = enabledModes.indexOf(currentMode);
  const nextMode = enabledModes[(currentIndex + 1) % enabledModes.length];

  return (
    <>
      <div>
        {currentMode === 'select' ? (
          <MoveSelect
            fen={currentFen}
            onSubmit={(move) => handleSubmitWithTracking(move, 'select')}
            onChange={onErrorClear}
            disabled={disabled}
            placeholder={selectPlaceholder}
          />
        ) : currentMode === 'button' ? (
          <ButtonInput
            fen={currentFen}
            onSubmit={(move) => handleSubmitWithTracking(move, 'button')}
            disabled={disabled}
            playerColor={playerColor}
            onClearError={onErrorClear}
          />
        ) : (
          <MoveInput
            value={moveInput}
            onChange={(value) => {
              onMoveInputChange(value);
              onErrorClear();
            }}
            onSubmit={(move, usedAutocomplete) =>
              handleSubmitWithTracking(move, usedAutocomplete ? 'text-autocomplete' : 'text')
            }
            disabled={disabled}
            placeholder={inputPlaceholder}
            showSuggestions={preferences.enableAutoComplete}
            showSubmitButton={true}
          />
        )}
        {error && invalidAttemptCount >= INVALID_ATTEMPTS_THRESHOLD && !showLegalMoves && (
          <button
            type="button"
            onClick={handleShowLegalMoves}
            className="text-sm text-primary hover:text-primary/80 underline mt-1"
          >
            {t('showLegalMoves')}
          </button>
        )}
        {showLegalMoves && (
          <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">{t('legalMovesList')}</p>
            <div className="flex flex-wrap gap-1.5">
              {getLegalMoves(currentFen)
                .sort()
                .map((move) => (
                  <span
                    key={move}
                    className="px-2 py-0.5 text-sm font-mono bg-card border border-border rounded"
                  >
                    {move}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
      {enabledModes.length >= 2 && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              updatePreferences({ moveInputMode: nextMode });
            }}
            className="p-2 border border-border rounded-md hover:bg-muted"
            title={toggleTitle}
          >
            {modeIcons[nextMode]}
          </button>
        </div>
      )}
    </>
  );
}
