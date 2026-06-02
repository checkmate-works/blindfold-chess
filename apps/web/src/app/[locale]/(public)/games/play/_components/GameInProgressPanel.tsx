'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FlagIcon, UndoIcon } from '@blindfold-chess/icons';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaClipboardList, FaCog } from 'react-icons/fa';

import type { MoveInputMethod } from '@/lib/games/saved-game-types';

import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import type { ConfirmationDialogs } from '../_hooks';
import { ACTION_ROW_CONTAINER_CLASSES } from '../_lib';

type Props = {
  isPlayerTurn: boolean;
  isLoading: boolean;
  isAiThinking: boolean;
  preferences: GamePreferences;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  currentFen: string;
  moveInput: string;
  setMoveInput: (value: string) => void;
  error: string | null;
  onErrorClear: () => void;
  handleSubmitMove: (move: AlgebraicNotation) => boolean | void | Promise<void>;
  moves: AlgebraicNotation[];
  confirmationDialogs: ConfirmationDialogs;
  playerColor?: 'w' | 'b';
  inlineBoardView?: ReactNode;
  onMoveCommitted?: (inputMethod: MoveInputMethod) => void;
  onMovePeek?: () => void;
  /**
   * Routes the MoveInputPanel mode-toggle through the per-game change log
   * instead of the global `updatePreferences`. Optional so other surfaces
   * (puzzle, practice) can keep the original global-write behavior.
   */
  setMoveInputMode?: (mode: GamePreferences['moveInputMode']) => void;
  onShowOperationLog?: () => void;
  /**
   * Opens the mid-game settings modal. Omit (undefined) to hide the gear
   * icon entirely — used for legacy games without a `gamePreferences`
   * snapshot, where there is no per-game baseline to edit against.
   */
  onShowSettings?: () => void;
  /**
   * When the last AI move failed, carries the i18n'd error message and a
   * `retry` callback that tears down the dead engine and re-requests a move.
   * Null when there is nothing to retry.
   */
  aiMoveError: { message: string; retry: () => void } | null;
};

export function GameInProgressPanel({
  isPlayerTurn,
  isLoading,
  isAiThinking,
  preferences,
  updatePreferences,
  currentFen,
  moveInput,
  setMoveInput,
  error,
  onErrorClear,
  handleSubmitMove,
  moves,
  confirmationDialogs,
  playerColor,
  inlineBoardView,
  onMoveCommitted,
  onMovePeek,
  setMoveInputMode,
  onShowOperationLog,
  onShowSettings,
  aiMoveError,
}: Props) {
  const t = useTranslations('play');

  return (
    <div className="flex flex-col gap-6">
      {/* Board, with a thin control toolbar pinned directly beneath it. The
          board-related controls (per-game settings + game details) live here,
          next to the board they act on, instead of in the panel's bottom row.
          The toolbar sits OUTSIDE the board's blindfold mask (so it stays
          operable while the board is masked) and below the board squares (so it
          never overlaps pieces). */}
      <div className="space-y-2">
        {inlineBoardView}
        {(onShowSettings || onShowOperationLog) && (
          <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
            {onShowSettings && (
              <button
                type="button"
                onClick={onShowSettings}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
                title={t('settings.title')}
              >
                <FaCog className="h-4 w-4" />
                <span>{t('settings.title')}</span>
              </button>
            )}
            {onShowOperationLog && (
              <button
                type="button"
                onClick={onShowOperationLog}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
                title={t('gameDetails.title')}
              >
                <FaClipboardList className="h-4 w-4" />
                <span>{t('gameDetails.title')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Move Input */}
      {/* AI thinking or retry → disabled real UI, not skeleton */}
      <MoveInputPanel
        preferences={preferences}
        updatePreferences={updatePreferences}
        currentFen={currentFen}
        moveInput={moveInput}
        onMoveInputChange={setMoveInput}
        error={error}
        onErrorClear={onErrorClear}
        onSubmit={handleSubmitMove}
        disabled={isLoading || !isPlayerTurn}
        inputPlaceholder={t('inputMove')}
        selectPlaceholder={t('selectMove')}
        toggleTitle={t('switchInputMode')}
        playerColor={playerColor}
        onMoveCommitted={onMoveCommitted}
        setMoveInputMode={setMoveInputMode}
        onMovePeek={onMovePeek}
        showInlineError={false}
      />

      {/* AI move failed → offer an inline Retry that tears down the dead
          engine and re-requests a move, so the user does not need to reload
          the page. The message already shows in the page-level status slot
          (PageTitle) via `moveInput.error`; this row adds the affordance. */}
      {aiMoveError && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={aiMoveError.retry}
            disabled={isLoading}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className={ACTION_ROW_CONTAINER_CLASSES}>
        <button
          onClick={confirmationDialogs.undo.open}
          disabled={moves.length < 2 || isAiThinking}
          className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={t('undo')}
        >
          <UndoIcon className="w-4 h-4" />
          <span className="hidden md:inline">{t('undo')}</span>
        </button>
        <button
          onClick={confirmationDialogs.resign.open}
          disabled={isAiThinking}
          className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={t('resign')}
        >
          <FlagIcon className="w-4 h-4" />
          <span className="hidden md:inline">{t('resign')}</span>
        </button>
      </div>

      {/* Save and Exit */}
      <div className="text-center">
        <Link href="/games" className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
          💾 {t('saveAndExit')}
        </Link>
      </div>
    </div>
  );
}
