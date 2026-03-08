'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useConfirmationDialogs, useGameSession, useMoveNavigation } from '../_hooks';
import { BoardViewModal } from './BoardViewModal';
import { GameInProgressPanel } from './GameInProgressPanel';
import { InlineBoardView } from './InlineBoardView';
import { MovesPanel } from './MovesPanel';
import { SkillLevelSettingsModal } from './SkillLevelSettingsModal';

type Props = {
  locale: Locale;
  onAiMoveChange?: (move: string | null) => void;
};

export function PlayClient({ locale, onAiMoveChange }: Props) {
  const t = useTranslations('play');
  const router = useRouter();

  const { gameConfig, gameState, moveState, moveInput, actions } = useGameSession({
    locale,
    onAiMoveChange,
  });

  const { playerSide, skillLevel, startingFen, perGamePrefs, gameId } = gameConfig;
  const { gameStatus, playerResult, isPlayerTurn, isLoading, lastMove } = gameState;
  const { moves, currentFen, formattedPgn } = moveState;
  const { value: moveInputValue, setValue: setMoveInput, error, setError } = moveInput;
  const {
    handleSubmitMove,
    handleResign,
    handleUndo,
    handleRestartFromPosition,
    handleNewGameFromPosition,
    handleSkillLevelChange,
  } = actions;

  // Global preferences
  const { preferences: globalPreferences, updatePreferences } = useGamePreferences();

  // Merge per-game preferences with global preferences
  // Per-game fields override global; other fields come from global
  const preferences: GamePreferences = useMemo(() => {
    if (!perGamePrefs) return globalPreferences;
    return {
      ...globalPreferences,
      showBoardButtonInGame: perGamePrefs.showBoardButtonInGame,
      highlightLastMove: perGamePrefs.highlightLastMove,
      showOwnPieces: perGamePrefs.showOwnPieces,
      showOpponentPieces: perGamePrefs.showOpponentPieces,
      pieceShapeMode: perGamePrefs.pieceShapeMode,
      pieceColors: perGamePrefs.pieceColors,
    };
  }, [globalPreferences, perGamePrefs]);

  // UI state
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

  // Redirect to result page when game is over
  useEffect(() => {
    if (gameStatus !== 'in_progress' && playerResult && gameId) {
      router.replace(`/${locale}/games/play/result?gameId=${gameId}`);
    }
  }, [gameStatus, playerResult, gameId, locale, router]);

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
                moveInput={moveInputValue}
                setMoveInput={setMoveInput}
                error={error}
                setError={setError}
                handleSubmitMove={handleSubmitMove}
                moves={moves}
                confirmationDialogs={confirmationDialogs}
                onShowBoard={() => setIsBoardVisible(true)}
                onShowSkillLevelSettings={() => setShowSkillLevelSettingsModal(true)}
                playerColor={playerSide === 'black' ? 'b' : 'w'}
                inlineBoardView={
                  preferences.showBoardButtonInGame && preferences.peekMode === 'inline' ? (
                    <InlineBoardView
                      fen={displayFen || currentFen}
                      playerSide={playerSide}
                      lastMove={
                        preferences.highlightLastMove && currentPosition === -1 ? lastMove : null
                      }
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
                  ) : undefined
                }
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
        onCancel={confirmationDialogs.resign.close}
        onConfirm={confirmationDialogs.resign.confirm}
        title={t('confirmResignTitle')}
        message={t('confirmResignMessage')}
        confirmText={t('confirmResign')}
        cancelText={t('cancel')}
        confirmVariant="danger"
      />

      {/* Undo Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.undo.isOpen}
        onCancel={confirmationDialogs.undo.close}
        onConfirm={confirmationDialogs.undo.confirm}
        title={t('confirmUndoTitle')}
        message={t('confirmUndoMessage')}
        confirmText={t('confirmUndo')}
        cancelText={t('cancel')}
      />

      {/* Restart Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationDialogs.restart.isOpen}
        onCancel={confirmationDialogs.restart.close}
        onConfirm={confirmationDialogs.restart.confirm}
        title={t('confirmRestartTitle')}
        message={t('confirmRestartMessage')}
        confirmText={t('confirmRestart')}
        cancelText={t('cancel')}
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
