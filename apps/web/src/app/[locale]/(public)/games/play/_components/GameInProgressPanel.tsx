'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FlagIcon, SpinnerIcon, UndoIcon } from '@blindfold-chess/icons';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaEye } from 'react-icons/fa';

import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { ConfirmationDialogs } from '../_hooks';

type Props = {
  isPlayerTurn: boolean;
  isLoading: boolean;
  preferences: GamePreferences;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  currentFen: string;
  moveInput: string;
  setMoveInput: (value: string) => void;
  error: string | null;
  setError: (value: string | null) => void;
  handleSubmitMove: (move: AlgebraicNotation) => void;
  moves: AlgebraicNotation[];
  confirmationDialogs: ConfirmationDialogs;
  onShowBoard: () => void;
  onShowSkillLevelSettings: () => void;
  playerColor?: 'w' | 'b';
  inlineBoardView?: ReactNode;
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
  setError,
  handleSubmitMove,
  moves,
  confirmationDialogs,
  onShowBoard,
  onShowSkillLevelSettings,
  playerColor,
  inlineBoardView,
}: Props) {
  const t = useTranslations('play');
  const showModalPeekButton = preferences.showBoardButtonInGame && preferences.peekMode === 'modal';

  return (
    <div className="flex flex-col gap-6">
      {/* Inline Board View (accordion) */}
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
          onErrorClear={() => {
            if (error) setError(null);
          }}
          onSubmit={handleSubmitMove}
          disabled={isLoading}
          inputPlaceholder={t('inputMove')}
          selectPlaceholder={t('selectMove')}
          toggleTitle={t('switchInputMode')}
          playerColor={playerColor}
        />
      ) : (
        <div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <p>{isLoading ? t('aiThinking') : t('yourMove')}</p>
            {isLoading && <SpinnerIcon size={16} className="animate-spin text-primary" />}
          </div>
        </div>
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

      {/* Settings Links */}
      <div className="text-center">
        <button
          onClick={onShowSkillLevelSettings}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          {t('configureSkillLevel')}
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
    </div>
  );
}
