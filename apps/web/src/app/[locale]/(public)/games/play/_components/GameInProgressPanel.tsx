'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FlagIcon, UndoIcon } from '@blindfold-chess/icons';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaClipboardList, FaMinus, FaTimes, FaTrophy } from 'react-icons/fa';

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
   * When the last AI move failed, carries the i18n'd error message and a
   * `retry` callback that tears down the dead engine and re-requests a move.
   * Null when there is nothing to retry.
   */
  aiMoveError: { message: string; retry: () => void } | null;
  /**
   * Render the panel in finished-game review mode: the board and the move-list
   * navigation stay interactive so the game can be replayed, but every control
   * that would MUTATE the game (move submission, undo, resign) is disabled and
   * covered by a "This game has ended" overlay. The in-progress-only affordances
   * (AI-retry, Save and Exit) are dropped entirely.
   */
  finished?: boolean;
  /**
   * The player's terminal result, used to label the finished-review overlay
   * (win / loss / draw). Only read when `finished` is true.
   */
  finishedResult?: 'win' | 'loss' | 'draw' | null;
  /**
   * Content rendered directly below the (frozen) mutating controls in
   * `finished` mode — used for the earned-Exp display. Ignored while the game
   * is in progress.
   */
  finishedFooter?: ReactNode;
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
  aiMoveError,
  finished = false,
  finishedResult,
  finishedFooter,
}: Props) {
  const t = useTranslations('play');

  return (
    <div className="flex flex-col gap-6">
      {inlineBoardView}

      {/* Mutating controls (move input + undo/resign). In finished-review mode
          these stay mounted for visual continuity with the in-progress game but
          are all disabled and covered by the "This game has ended" overlay, so
          the frozen game reads as the same screen you just played rather than a
          separate results card. */}
      <div className="relative flex flex-col gap-6">
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
          disabled={isLoading || !isPlayerTurn || finished}
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
            (PageTitle) via `moveInput.error`; this row adds the affordance.
            Retry re-requests a move, so it is irrelevant once the game is over. */}
        {aiMoveError && !finished && (
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
            disabled={moves.length < 2 || isAiThinking || finished}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={t('undo')}
          >
            <UndoIcon className="w-4 h-4" />
            <span className="hidden md:inline">{t('undo')}</span>
          </button>
          <button
            onClick={confirmationDialogs.resign.open}
            disabled={isAiThinking || finished}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            title={t('resign')}
          >
            <FlagIcon className="w-4 h-4" />
            <span className="hidden md:inline">{t('resign')}</span>
          </button>
        </div>

        {/* Overlay over the mutating controls once the game is over. Combined
            with `disabled` on each control it makes the region inert (the board
            and move list stay interactive for replay). Deliberately NO frosted
            tint/blur here — that read as the "Tap to reveal" blindfold mask;
            this is just the result + a hint that the game is over. */}
        {finished && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-lg bg-background/80 text-center">
            {finishedResult === 'win' && <FaTrophy className="w-8 h-8 text-primary" />}
            {finishedResult === 'loss' && <FaTimes className="w-8 h-8 text-destructive" />}
            {finishedResult === 'draw' && <FaMinus className="w-8 h-8 text-warning" />}
            <span className="text-lg font-bold">
              {finishedResult === 'win'
                ? t('youWin')
                : finishedResult === 'loss'
                  ? t('youLose')
                  : t('draw')}
            </span>
            <span className="text-sm text-muted-foreground">{t('finishedGame.heading')}</span>
          </div>
        )}
      </div>

      {/* Earned Exp (and any other finished-only footer content), shown just
          below the frozen controls / result overlay. */}
      {finished && finishedFooter}

      {/* Save and Exit — an in-progress affordance; a finished game is already
          persisted, so it is dropped in review mode. */}
      {!finished && (
        <div className="text-center">
          <Link href="/games" className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            💾 {t('saveAndExit')}
          </Link>
        </div>
      )}

      {/* Game Details (opponent / engine info, initial per-game settings, and
          the mid-game change log — see OperationLogModal). Per-game settings
          has its own gear on the board itself. */}
      {onShowOperationLog && (
        <div className="flex justify-end items-center gap-2 text-muted-foreground">
          <button
            type="button"
            onClick={onShowOperationLog}
            className="p-1 leading-none hover:text-foreground"
            title={t('gameDetails.title')}
          >
            <FaClipboardList className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
