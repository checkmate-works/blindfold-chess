'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useConfirmationDialogs, useGameSession, useMoveNavigation } from '../_hooks';
import { BoardViewModal } from './BoardViewModal';
import { ConfirmationModal } from './ConfirmationModal';
import { GameInProgressPanel } from './GameInProgressPanel';
import { GameOverContent } from './GameOverContent';
import { GameSettingsModal } from './GameSettingsModal';
import { MovesPanel } from './MovesPanel';
import { SkillLevelSettingsModal } from './SkillLevelSettingsModal';

type Props = {
  locale: Locale;
  onAiMoveChange?: (move: string | null) => void;
};

export function PlayClient({ locale, onAiMoveChange }: Props) {
  const t = useTranslations('play');

  const {
    playerSide,
    skillLevel,
    initialGameId,
    startingFen,

    gameStatus,
    playerResult,
    isPlayerTurn,
    isLoading,
    lastMove,

    moves,
    currentFen,
    formattedPgn,

    moveInput,
    setMoveInput,
    error,
    setError,

    handleSubmitMove,
    handleResign,
    handleUndo,
    handleRestartFromPosition,
    handleNewGameFromPosition,
    handleSkillLevelChange,
  } = useGameSession({ locale, onAiMoveChange });

  // Preferences
  const { preferences, updatePreferences } = useGamePreferences();

  // UI state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSkillLevelSettingsModal, setShowSkillLevelSettingsModal] = useState(false);
  const [isBoardVisible, setIsBoardVisible] = useState(false);

  // Navigation hook
  const {
    currentPosition,
    displayFen: hookDisplayFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
    resetNavigation,
  } = useMoveNavigation({
    moves,
    startingFen,
  });

  // Reset to latest position when new moves are added
  const previousMovesLength = useRef(moves.length);
  useEffect(() => {
    if (moves.length > previousMovesLength.current) {
      resetNavigation();
    }
    previousMovesLength.current = moves.length;
  }, [moves.length, resetNavigation]);

  const displayFen = hookDisplayFen;

  // Confirmation dialogs
  const confirmationDialogs = useConfirmationDialogs({
    onResignConfirm: handleResign,
    onUndoConfirm: handleUndo,
    onRestartConfirm: (position: number) => {
      handleRestartFromPosition(position);
      resetNavigation();
    },
  });

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg p-4">
            {/* In Progress Content */}
            {gameStatus === 'in_progress' && (
              <GameInProgressPanel
                isPlayerTurn={isPlayerTurn}
                isLoading={isLoading}
                preferences={preferences}
                updatePreferences={updatePreferences}
                currentFen={currentFen}
                moveInput={moveInput}
                setMoveInput={setMoveInput}
                error={error}
                setError={setError}
                handleSubmitMove={handleSubmitMove}
                moves={moves}
                confirmationDialogs={confirmationDialogs}
                onShowBoard={() => setIsBoardVisible(true)}
                onShowSkillLevelSettings={() => setShowSkillLevelSettingsModal(true)}
                t={t}
              />
            )}

            {/* Game Over Content */}
            {gameStatus !== 'in_progress' && playerResult && (
              <GameOverContent
                locale={locale}
                playerResult={playerResult}
                playerSide={playerSide}
                skillLevel={skillLevel}
                moves={moves}
                formattedPgn={formattedPgn}
                startingFen={startingFen}
                initialGameId={initialGameId}
                onShowBoard={() => setIsBoardVisible(true)}
              />
            )}
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          <MovesPanel
            formattedPgn={formattedPgn}
            currentPosition={currentPosition}
            movesLength={moves.length}
            currentFen={currentFen}
            displayFen={displayFen}
            startingFen={startingFen}
            gameInProgress={gameStatus === 'in_progress'}
            onNavigateToPosition={navigateToPosition}
            onNavigateToStart={navigateToStart}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onNavigateToEnd={navigateToEnd}
            onRestartFromPosition={confirmationDialogs.restart.openWithPosition}
            onNewGameFromPosition={handleNewGameFromPosition}
          />
        </div>
      </div>

      {/* Resign Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.resign.isOpen}
        onClose={confirmationDialogs.resign.close}
        onConfirm={confirmationDialogs.resign.confirm}
        title={t('confirmResignTitle')}
        message={t('confirmResignMessage')}
        confirmText={t('confirmResign')}
        cancelText={t('cancel')}
        variant="destructive"
      />

      {/* Undo Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.undo.isOpen}
        onClose={confirmationDialogs.undo.close}
        onConfirm={confirmationDialogs.undo.confirm}
        title={t('confirmUndoTitle')}
        message={t('confirmUndoMessage')}
        confirmText={t('confirmUndo')}
        cancelText={t('cancel')}
        variant="primary"
      />

      {/* Restart Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.restart.isOpen}
        onClose={confirmationDialogs.restart.close}
        onConfirm={confirmationDialogs.restart.confirm}
        title={t('confirmRestartTitle')}
        message={t('confirmRestartMessage')}
        confirmText={t('confirmRestart')}
        cancelText={t('cancel')}
        variant="primary"
      />

      {/* Board View Modal */}
      <BoardViewModal
        isOpen={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        fen={displayFen || currentFen}
        playerSide={playerSide}
        lastMove={preferences.highlightLastMove && currentPosition === -1 ? lastMove : null}
        preferences={preferences}
        movesLength={moves.length}
        currentPosition={currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={navigateToStart}
        onNavigatePrevious={navigatePrevious}
        onNavigateNext={navigateNext}
        onNavigateToEnd={navigateToEnd}
        onNavigateToPosition={navigateToPosition}
      />

      {/* Settings Modal */}
      <GameSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        playerSide={playerSide}
      />

      {/* Skill Level Settings Modal */}
      <SkillLevelSettingsModal
        isOpen={showSkillLevelSettingsModal}
        onClose={() => setShowSkillLevelSettingsModal(false)}
        currentSkillLevel={skillLevel}
        onSkillLevelChange={handleSkillLevelChange}
      />
    </div>
  );
}
