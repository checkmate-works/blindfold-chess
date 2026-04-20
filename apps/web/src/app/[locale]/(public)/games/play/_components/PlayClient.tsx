'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { notFound, useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useBoardFlip, useConfirmationDialogs, useMoveNavigation } from '../_hooks';
import type { GameSession } from '../_hooks/use-game-session';
import { BoardViewModal } from './BoardViewModal';
import { GameInProgressPanel } from './GameInProgressPanel';
import { InlineBoardView } from './InlineBoardView';
import { MoveInputSkeleton } from './MoveInputSkeleton';
import { MovesPanel } from './MovesPanel';
import { MovesPanelSkeleton } from './MovesPanelSkeleton';
import { OperationLogModal } from './OperationLogModal';
import {
  ActionRowSkeleton,
  IconButtonSkeleton,
  InlineBoardHeaderSkeleton,
  TextLinkSkeleton,
} from './skeletons';

type Props = {
  locale: Locale;
  gameSession: GameSession;
};

export function PlayClient({ locale, gameSession }: Props) {
  const t = useTranslations('play');
  const router = useRouter();

  const { gameConfig, gameState, moveState, moveInput, actions, operationLogs } = gameSession;

  const { playerSide, startingFen, perGamePrefs, gameId } = gameConfig;
  const {
    gameStatus,
    playerResult,
    isPlayerTurn,
    isLoading,
    isLoadingFromStorage,
    lastMove,
    gameNotFound,
  } = gameState;
  const { moves, currentFen, formattedPgn } = moveState;
  const { value: moveInputValue, setValue: setMoveInput, error, clearMoveError } = moveInput;
  const {
    handleSubmitMove,
    handleResign,
    handleUndo,
    handleRestartFromPosition,
    handleNewGameFromPosition,
    commitMoveLog,
    recordPeek,
    recordMovePeek,
  } = actions;

  // Global preferences
  const { preferences: globalPreferences, updatePreferences, isHydrated } = useGamePreferences();
  const isInitializing = isLoadingFromStorage || !isHydrated;

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
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [showOperationLogModal, setShowOperationLogModal] = useState(false);

  // Board flip state
  const { effectiveFlipped, toggleFlip: handleFlipBoard } = useBoardFlip({ playerSide });

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

  if (gameNotFound) {
    notFound();
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <div>
            {/* In Progress Content */}
            {gameStatus === 'in_progress' && isInitializing && (
              <div className="flex flex-col gap-6">
                {/* InlineBoardView header (~46px). Only reserved once preferences
                    are hydrated, so `modal` peek users (the defaults) are not
                    subjected to a counter-productive upward shift during SSR →
                    hydration. */}
                {isHydrated &&
                  preferences.showBoardButtonInGame &&
                  preferences.peekMode === 'inline' && <InlineBoardHeaderSkeleton />}
                <MoveInputSkeleton
                  mode={preferences.moveInputMode}
                  variant="initial"
                  hasModeSwitch={preferences.enabledMoveInputModes.length >= 2}
                />
                {/* Action row (Show Board + Undo + Resign). Default preferences
                    have `peekMode='modal'` and `showBoardButtonInGame=true`, so
                    gating on `isHydrated` is unnecessary: the pre-hydration
                    reservation matches the hydrated one. */}
                <ActionRowSkeleton
                  showBoardButton={
                    preferences.showBoardButtonInGame && preferences.peekMode === 'modal'
                  }
                />
                {/* Save and Exit link: text-sm ≈ 20px */}
                <TextLinkSkeleton />
                {/* Operation Log trigger: w-4 h-4 icon + padding ≈ 24px */}
                <IconButtonSkeleton />
              </div>
            )}
            {gameStatus === 'in_progress' && !isInitializing && (
              <GameInProgressPanel
                isPlayerTurn={isPlayerTurn}
                isLoading={isLoading}
                preferences={preferences}
                updatePreferences={updatePreferences}
                currentFen={currentFen}
                moveInput={moveInputValue}
                setMoveInput={setMoveInput}
                error={error}
                onErrorClear={clearMoveError}
                handleSubmitMove={handleSubmitMove}
                moves={moves}
                confirmationDialogs={confirmationDialogs}
                // Peek tracking: counts each "open" action, not view duration.
                // Modal: counted when opened; closing and reopening counts again.
                // Inline: counted when accordion expands; collapsing and re-expanding counts again.
                onShowBoard={() => {
                  recordPeek();
                  setIsBoardVisible(true);
                }}
                playerColor={playerSide === 'black' ? 'b' : 'w'}
                onMoveCommitted={commitMoveLog}
                onMovePeek={recordMovePeek}
                onShowOperationLog={() => setShowOperationLogModal(true)}
                inlineBoardView={
                  preferences.showBoardButtonInGame && preferences.peekMode === 'inline' ? (
                    <InlineBoardView
                      fen={displayFen || currentFen}
                      playerSide={playerSide}
                      flipped={effectiveFlipped}
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
                      onFlipBoard={handleFlipBoard}
                      onPeek={recordPeek}
                    />
                  ) : undefined
                }
              />
            )}
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          {isInitializing ? (
            <MovesPanelSkeleton />
          ) : (
            <MovesPanel
              moveList={{
                formattedPgn,
                currentPosition,
                movesLength: moves.length,
                currentFen,
                displayFen,
                startingFen,
              }}
              navigation={{
                onNavigateToPosition: navigateToPosition,
                onNavigateToStart: navigateToStart,
                onNavigatePrevious: navigatePrevious,
                onNavigateNext: navigateNext,
                onNavigateToEnd: navigateToEnd,
              }}
              actions={{
                gameInProgress: gameStatus === 'in_progress',
                // FEN → Lichess URL derivation is a navigation concern, so it
                // lives here (the parent that owns routing) rather than in
                // MovesPanel. Mirrors the original inline behavior: latest
                // position uses currentFen, historical positions use displayFen.
                lichessAnalysisUrl: fenToLichessUrl(
                  currentPosition === -1 || displayFen === null ? currentFen : displayFen
                ),
                onRestartFromPosition: confirmationDialogs.restart.openWithPosition,
                onNewGameFromPosition: handleNewGameFromPosition,
              }}
              showBackground={false}
            />
          )}
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
        flipped={effectiveFlipped}
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
        onFlipBoard={handleFlipBoard}
      />

      {/* Operation Log Modal */}
      <OperationLogModal
        isOpen={showOperationLogModal}
        onClose={() => setShowOperationLogModal(false)}
        logs={operationLogs}
        moves={moves}
        playerSide={playerSide}
        startingFen={startingFen}
      />
    </div>
  );
}
