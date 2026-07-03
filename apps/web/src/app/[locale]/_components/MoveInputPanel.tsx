'use client';

import { type ReactNode, useMemo } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLegalMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaGamepad, FaKeyboard, FaList } from 'react-icons/fa';

import type { MoveInputMethod } from '@/lib/games/saved-game-types';

import { ButtonInput } from '@/app/[locale]/(public)/games/play/_components/ButtonInput';
import { MoveInput } from '@/app/[locale]/(public)/games/play/_components/MoveInput';
import { MoveSelect } from '@/app/[locale]/(public)/games/play/_components/MoveSelect';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useMoveSubmitTracking } from './use-move-submit-tracking';

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
  /**
   * When `true` (default), renders the `error` message inline right below the
   * input area. Set to `false` when the consumer surfaces the error elsewhere
   * (e.g. the page-level PageTitle slot in `/games/play`) to avoid double
   * display.
   */
  showInlineError?: boolean;
  /**
   * When `true`, draws a success-colored ring around the input area (mirroring
   * the destructive ring shown while `error` is set). Used to give positive
   * "move accepted" feedback at the point of action — e.g. the recall
   * screen rings the input green on a correct recall. Ignored while `error`
   * is set (the destructive ring takes precedence).
   */
  success?: boolean;
  /**
   * When `true` (default), shows a "show legal moves" affordance after the
   * user submits invalid moves `INVALID_ATTEMPTS_THRESHOLD` times in a row
   * (and renders the full legal-move list once the user opts in).
   *
   * Set to `false` on surfaces where revealing the legal-move list would
   * effectively give the answer away — notably the puzzle-solving screen,
   * where the solution move is always a legal move and surfacing every legal
   * move would trivialize the puzzle. The invalid-attempt counter still ticks
   * internally (used for the `onSubmit` truthiness contract), only the
   * UI affordance is suppressed.
   */
  showLegalMovesHint?: boolean;
  /**
   * Optional override for the move-input mode switch. When provided, the
   * mode toggle button calls this instead of `updatePreferences` — used by
   * the games/play surface to route mid-game switches into the per-game
   * preference change log rather than mutating the user's global default.
   * Other surfaces (puzzle, practice) leave this unset and fall back to
   * the global `updatePreferences` path.
   */
  setMoveInputMode?: (mode: GamePreferences['moveInputMode']) => void;
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
  showInlineError = true,
  success = false,
  showLegalMovesHint = true,
  setMoveInputMode,
}: Props) {
  const t = useTranslations('play');
  const enabledModes = preferences.enabledMoveInputModes;

  // Defensive: if current mode is not in enabled list, fall back to first enabled mode
  const currentMode = enabledModes.includes(preferences.moveInputMode)
    ? preferences.moveInputMode
    : enabledModes[0];

  // Invalid-attempt tracking, one-shot shake, and mode-change reset all live in
  // the feedback state machine.
  const {
    inputAreaRef,
    invalidAttemptCount,
    showLegalMoves,
    handleSubmitWithTracking,
    handleShowLegalMoves,
  } = useMoveSubmitTracking({ onSubmit, onMoveCommitted, onMovePeek, currentMode, onErrorClear });

  const legalMoves = useMemo(
    () => (showLegalMoves ? getLegalMoves(currentFen).sort() : null),
    [showLegalMoves, currentFen]
  );

  // Compute next mode for cycling
  const currentIndex = enabledModes.indexOf(currentMode);
  const nextMode = enabledModes[(currentIndex + 1) % enabledModes.length];

  return (
    <>
      <div>
        {/* Shake + red-ring target. `rounded-lg` matches the inputs so the
            ring hugs their corners; the ring persists while `error` is set
            and rides along with the one-shot shake. */}
        <div
          ref={inputAreaRef}
          className={`rounded-lg transition-shadow ${
            error ? 'ring-2 ring-destructive' : success ? 'ring-2 ring-success' : ''
          }`}
        >
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
        </div>
        {showInlineError && error && <p className="text-destructive text-sm mt-2">{error}</p>}
        {showLegalMovesHint &&
          error &&
          invalidAttemptCount >= INVALID_ATTEMPTS_THRESHOLD &&
          !showLegalMoves && (
            <button
              type="button"
              onClick={handleShowLegalMoves}
              className="text-sm text-primary hover:text-primary/80 underline mt-1 touch-manipulation select-none"
            >
              {t('showLegalMoves')}
            </button>
          )}
        {legalMoves && (
          <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">{t('legalMovesList')}</p>
            <div className="flex flex-wrap gap-1.5">
              {legalMoves.map((move) => (
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
            type="button"
            onClick={() => {
              if (setMoveInputMode) {
                setMoveInputMode(nextMode);
              } else {
                updatePreferences({ moveInputMode: nextMode });
              }
            }}
            disabled={disabled}
            // Anchor for the play help tour (see PlayHelpTour). Harmless where
            // this panel is reused outside the play surface — no tour targets it.
            data-tour-id="play-input-mode"
            className="p-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none"
            title={toggleTitle}
          >
            {modeIcons[nextMode]}
          </button>
        </div>
      )}
    </>
  );
}
