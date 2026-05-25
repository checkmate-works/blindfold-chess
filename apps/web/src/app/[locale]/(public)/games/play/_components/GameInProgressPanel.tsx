'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FlagIcon, UndoIcon } from '@blindfold-chess/icons';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaClipboardList, FaCog, FaInfoCircle } from 'react-icons/fa';

import type { MoveInputMethod } from '@/lib/games/saved-game-types';

import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import type { ConfirmationDialogs } from '../_hooks';
import { shouldShowModalPeekButton } from '../_lib';
import { ShowBoardButton } from './ShowBoardButton';

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
  onShowBoard: () => void;
  playerColor?: 'w' | 'b';
  inlineBoardView?: ReactNode;
  onMoveCommitted?: (inputMethod: MoveInputMethod) => void;
  onMovePeek?: () => void;
  onShowOperationLog?: () => void;
  /**
   * Opens the engine info modal — same pattern as `onShowOperationLog`.
   * The modal itself is owned by the page so its lifecycle is shared
   * with other modals (focus restoration, scroll lock).
   */
  onShowEngineInfo: () => void;
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
  onShowBoard,
  playerColor,
  inlineBoardView,
  onMoveCommitted,
  onMovePeek,
  onShowOperationLog,
  onShowEngineInfo,
  onShowSettings,
  aiMoveError,
}: Props) {
  const t = useTranslations('play');
  const showModalPeekButton = shouldShowModalPeekButton(preferences);

  return (
    <div className="flex flex-col gap-6">
      {/* Inline Board View (peek mode === 'inline').
          NOTE: Header height (~46px) + parent gap-6 (24px) is reserved in
          PlayClient's initializing skeleton when preferences indicate inline
          peek. Changes to the header padding / text size here must be kept
          in sync with that reservation. */}
      {inlineBoardView}

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
      <div className="flex gap-4 md:gap-2 justify-center">
        {showModalPeekButton && <ShowBoardButton onClick={onShowBoard} />}
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

      {/* Engine info + Operation Log. Both icons share the same hit
          target (`p-1` on a 1rem icon → 1.5rem square) and the row
          uses `items-center` so the visual centres line up regardless
          of the icons' internal glyph metrics — FaInfoCircle's filled
          circle and FaClipboardList's tall rectangle have different
          centre-of-mass without explicit padding. */}
      <div className="flex justify-end items-center gap-2 text-muted-foreground">
        <button
          type="button"
          onClick={onShowEngineInfo}
          className="p-1 leading-none hover:text-foreground"
          title={t('engineInfo.title')}
        >
          <FaInfoCircle className="w-4 h-4" />
        </button>
        {onShowOperationLog && (
          <button
            type="button"
            onClick={onShowOperationLog}
            className="p-1 leading-none hover:text-foreground"
            title={t('operationLog.title')}
          >
            <FaClipboardList className="w-4 h-4" />
          </button>
        )}
        {onShowSettings && (
          <button
            type="button"
            onClick={onShowSettings}
            className="p-1 leading-none hover:text-foreground"
            title={t('settings.title')}
          >
            <FaCog className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
