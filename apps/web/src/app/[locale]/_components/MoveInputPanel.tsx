'use client';

import type { ReactNode } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaGamepad, FaKeyboard, FaList } from 'react-icons/fa';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { ButtonInput } from '@/app/[locale]/play/_components/ButtonInput';
import { MoveInput } from '@/app/[locale]/play/_components/MoveInput';
import { MoveSelect } from '@/app/[locale]/play/_components/MoveSelect';

type Props = {
  preferences: GamePreferences;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  currentFen: string;
  moveInput: string;
  onMoveInputChange: (value: string) => void;
  error: string | null;
  onErrorClear: () => void;
  onSubmit: (move: AlgebraicNotation) => void;
  disabled?: boolean;
  inputPlaceholder?: string;
  selectPlaceholder?: string;
  toggleTitle?: string;
  playerColor?: 'w' | 'b';
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
}: Props) {
  const enabledModes = preferences.enabledMoveInputModes;

  // Defensive: if current mode is not in enabled list, fall back to first enabled mode
  const currentMode = enabledModes.includes(preferences.moveInputMode)
    ? preferences.moveInputMode
    : enabledModes[0];

  // Compute next mode for cycling
  const currentIndex = enabledModes.indexOf(currentMode);
  const nextMode = enabledModes[(currentIndex + 1) % enabledModes.length];

  return (
    <>
      <div>
        {currentMode === 'select' ? (
          <MoveSelect
            fen={currentFen}
            onSubmit={onSubmit}
            onChange={onErrorClear}
            disabled={disabled}
            placeholder={selectPlaceholder}
          />
        ) : currentMode === 'button' ? (
          <ButtonInput
            fen={currentFen}
            onSubmit={onSubmit}
            disabled={disabled}
            playerColor={playerColor}
          />
        ) : (
          <MoveInput
            value={moveInput}
            onChange={(value) => {
              onMoveInputChange(value);
              onErrorClear();
            }}
            onSubmit={onSubmit}
            disabled={disabled}
            placeholder={inputPlaceholder}
            showSuggestions={preferences.enableAutoComplete}
            showSubmitButton={true}
          />
        )}
        {error && <p className="text-destructive text-sm mt-2">{error}</p>}
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
