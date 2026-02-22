'use client';

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
}: Props) {
  return (
    <>
      <div>
        {preferences.moveInputMode === 'select' ? (
          <MoveSelect
            fen={currentFen}
            onSubmit={onSubmit}
            onChange={onErrorClear}
            disabled={disabled}
            placeholder={selectPlaceholder}
          />
        ) : preferences.moveInputMode === 'button' ? (
          <ButtonInput fen={currentFen} onSubmit={onSubmit} disabled={disabled} />
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
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            const nextMode =
              preferences.moveInputMode === 'text'
                ? 'select'
                : preferences.moveInputMode === 'select'
                  ? 'button'
                  : 'text';
            updatePreferences({ moveInputMode: nextMode });
          }}
          className="p-2 border border-border rounded-md hover:bg-muted"
          title={toggleTitle}
        >
          {preferences.moveInputMode === 'text' ? (
            <FaList className="w-4 h-4" />
          ) : preferences.moveInputMode === 'select' ? (
            <FaGamepad className="w-4 h-4" />
          ) : (
            <FaKeyboard className="w-4 h-4" />
          )}
        </button>
      </div>
    </>
  );
}
