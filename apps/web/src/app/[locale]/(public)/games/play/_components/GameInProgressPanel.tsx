'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FlagIcon, UndoIcon } from '@blindfold-chess/icons';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaClipboardList, FaEye } from 'react-icons/fa';

import type { MoveInputMethod } from '@/lib/types';

import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { ConfirmationDialogs } from '../_hooks';
import { MoveInputSkeleton } from './MoveInputSkeleton';

type Props = {
  isPlayerTurn: boolean;
  isLoading: boolean;
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
};

export function GameInProgressPanel({
  isPlayerTurn,
  isLoading,
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
}: Props) {
  const t = useTranslations('play');
  const showModalPeekButton = preferences.showBoardButtonInGame && preferences.peekMode === 'modal';

  return (
    <div className="flex flex-col gap-6">
      {/* Inline Board View (peek mode === 'inline').
          NOTE: Header height (~46px) + parent gap-6 (24px) is reserved in
          PlayClient's initializing skeleton when preferences indicate inline
          peek. Changes to the header padding / text size here must be kept
          in sync with that reservation. */}
      {inlineBoardView}

      {/* Move Input */}
      {isPlayerTurn ? (
        <MoveInputPanel
          preferences={preferences}
          updatePreferences={updatePreferences}
          currentFen={currentFen}
          moveInput={moveInput}
          onMoveInputChange={setMoveInput}
          error={error}
          onErrorClear={onErrorClear}
          onSubmit={handleSubmitMove}
          disabled={isLoading}
          inputPlaceholder={t('inputMove')}
          selectPlaceholder={t('selectMove')}
          toggleTitle={t('switchInputMode')}
          playerColor={playerColor}
          onMoveCommitted={onMoveCommitted}
          onMovePeek={onMovePeek}
        />
      ) : (
        // AI-turn state. The "AI is thinking…" status is surfaced in the
        // page-level PageTitle slot (see PlayPageClient) rather than inline
        // here, so this branch renders only the skeleton to hold the
        // ButtonInput-shaped footprint while the AI computes.
        <MoveInputSkeleton
          mode={preferences.moveInputMode}
          variant="ai-turn"
          hasModeSwitch={preferences.enabledMoveInputModes.length >= 2}
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 md:gap-2 justify-center">
        {showModalPeekButton && (
          <button
            onClick={onShowBoard}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
            title={t('showBoard')}
          >
            <FaEye className="w-4 h-4" />
            <span className="hidden md:inline">{t('showBoard')}</span>
          </button>
        )}
        <button
          onClick={confirmationDialogs.undo.open}
          disabled={moves.length < 2}
          className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
          title={t('undo')}
        >
          <UndoIcon className="w-4 h-4" />
          <span className="hidden md:inline">{t('undo')}</span>
        </button>
        <button
          onClick={confirmationDialogs.resign.open}
          className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
          title={t('resign')}
        >
          <FlagIcon className="w-4 h-4" />
          <span className="hidden md:inline">{t('resign')}</span>
        </button>
      </div>

      {/* Save and Exit */}
      <div className="text-center">
        <Link
          href="/games"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          💾 {t('saveAndExit')}
        </Link>
      </div>

      {/* Operation Log */}
      {onShowOperationLog && (
        <div className="flex justify-end">
          <button
            onClick={onShowOperationLog}
            className="text-muted-foreground hover:text-foreground"
            title={t('operationLog.title')}
          >
            <FaClipboardList className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
