'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, ProgressBar } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaCheck, FaCog, FaQuestionCircle, FaSpinner } from 'react-icons/fa';

import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { MidGameSettingsModal } from '@/app/[locale]/(public)/games/play/_components/MidGameSettingsModal';
import { ShowBoardButton } from '@/app/[locale]/(public)/games/play/_components/ShowBoardButton';
import {
  ACTION_ROW_CONTAINER_CLASSES,
  shouldShowAlwaysVisibleBoard,
  shouldShowInlinePeekHeader,
  shouldShowModalPeekButton,
} from '@/app/[locale]/(public)/games/play/_lib';
import { useLoadGame } from '@/app/[locale]/(public)/games/play/result/_hooks/useLoadGame';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { Modal } from '@/app/[locale]/_components/Modal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { usePostmortemGame } from '../_hooks';
import { formatMoveNumberPrefix } from '../_lib/postmortem-format';
import { PostmortemMoveLogTable } from './PostmortemMoveLogTable';
import { PostmortemMovesPanel } from './PostmortemMovesPanel';

type Props = {
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
  /**
   * Saved-game id (from the postmortem deep-link). Used to seed the initial
   * board/input settings from the game's `gamePreferences` snapshot.
   */
  gameId?: string;
};

/**
 * Merge the saved game's per-game preference snapshot over the user's global
 * preferences, mirroring the play screen's merge (`usePlayClientPreferences`).
 * Legacy records may omit later-added fields, so those fall back to global.
 */
function mergePerGamePreferences(
  global: GamePreferences,
  perGame: PerGamePreferences | undefined
): GamePreferences {
  if (!perGame) return global;
  return {
    ...global,
    boardVisibility: perGame.boardVisibility ?? global.boardVisibility,
    highlightLastMove: perGame.highlightLastMove,
    showOwnPieces: perGame.showOwnPieces,
    showOpponentPieces: perGame.showOpponentPieces,
    pieceShapeMode: perGame.pieceShapeMode,
    pieceColors: perGame.pieceColors,
    peekMode: perGame.peekMode ?? global.peekMode,
    moveInputMode: perGame.moveInputMode ?? global.moveInputMode,
  };
}

export function PostmortemClient({
  pgn,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
  startingFen,
  gameId,
}: Props) {
  const t = useTranslations('postmortem');

  // Postmortem keeps its own *local* copy of the game preferences. It is
  // seeded from the saved game's snapshot (below) and mutated only in-memory:
  // edits are never written back to global preferences nor recorded in a
  // preferenceChangeLog — the review session is intentionally ephemeral.
  const { preferences: globalPreferences, isHydrated } = useGamePreferences();
  const loadState = useLoadGame(gameId ?? null);

  const [preferences, setPreferences] = useState<GamePreferences>(globalPreferences);
  const updatePreferences = useCallback((updates: Partial<GamePreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  // Seed once, after both the global preferences (localStorage) and the
  // saved-game lookup have settled. After seeding, the user owns this state.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!isHydrated) return;
    if (gameId && loadState.status === 'loading') return;
    seededRef.current = true;
    const perGame = loadState.status === 'loaded' ? loadState.game.gamePreferences : undefined;
    setPreferences(mergePerGamePreferences(globalPreferences, perGame));
  }, [isHydrated, gameId, loadState, globalPreferences]);

  const handlePerGamePrefChange = useCallback(
    <K extends keyof PerGamePreferences>(key: K, value: PerGamePreferences[K]) => {
      updatePreferences({ [key]: value } as Partial<GamePreferences>);
    },
    [updatePreferences]
  );

  const {
    gameProgress,
    boardState,
    moveInput,
    moveLog,
    settings,
    navigation,
    actions,
    formattedPgn,
  } = usePostmortemGame({
    pgn,
    playerColor,
    autoOpponent: initialAutoOpponent,
    initialOffset,
    startingFen,
  });

  // UI-only state (modal visibility)
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [showMoveLogModal, setShowMoveLogModal] = useState(false);
  const [showAnalyzeAllConfirm, setShowAnalyzeAllConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { currentFen, displayFen, currentLastMove } = boardState;
  const { isCompleted, totalMoves, progress, originalMoves } = gameProgress;

  // Board display follows the (seeded) preferences, exactly like the in-game
  // screen: always-visible inline board, collapsible peek-inline board, or a
  // modal opened from a "Show Board" button.
  const showAlwaysBoard = shouldShowAlwaysVisibleBoard(preferences);
  const showInlinePeek = shouldShowInlinePeekHeader(preferences);
  const showModalPeekButton = shouldShowModalPeekButton(preferences);
  const showInlineBoard = showAlwaysBoard || showInlinePeek;

  const boardFen = displayFen || currentFen;
  const sideToMove = boardFen.split(' ')[1] === 'b' ? 'black' : 'white';
  // Board-driven input is available only in always-visible mode and only when
  // the side to move is the move the user is expected to enter — mirroring the
  // play screen (ChessBoard makes only own-color pieces draggable).
  const canBoardInput =
    showAlwaysBoard &&
    !isCompleted &&
    !moveInput.isAnalyzingAll &&
    navigation.currentPosition === -1 &&
    settings.isPlayerTurn &&
    sideToMove === playerColor;

  const inlineBoardView = showInlineBoard ? (
    <InlineBoardView
      fen={boardFen}
      playerSide={playerColor}
      lastMove={
        preferences.highlightLastMove && navigation.currentPosition === -1 ? currentLastMove : null
      }
      preferences={preferences}
      movesLength={originalMoves.length}
      currentPosition={navigation.currentPosition}
      formattedPgn={formattedPgn}
      onNavigateToStart={navigation.navigateToStart}
      onNavigatePrevious={navigation.navigatePrevious}
      onNavigateNext={navigation.navigateNext}
      onNavigateToEnd={navigation.navigateToEnd}
      onNavigateToPosition={navigation.navigateToPosition}
      collapseSignal={progress}
      alwaysOpen={showAlwaysBoard}
      onMove={
        canBoardInput ? (san) => actions.handleSubmitMove(san as AlgebraicNotation) : undefined
      }
    />
  ) : null;

  // Format feedback message from structured data
  const feedback = moveInput.lastFeedback;
  const movePrefix = feedback
    ? formatMoveNumberPrefix(feedback.moveNumber, feedback.isWhiteMove)
    : '';
  const feedbackMessage = feedback
    ? feedback.type === 'incorrect'
      ? t('incorrectMoveError', { movePrefix, move: feedback.move })
      : feedback.type === 'skipped'
        ? t('skippedMoveMessage', { movePrefix, move: feedback.move })
        : t('correctMoveMessage', { movePrefix, move: feedback.move })
    : null;
  const feedbackIsError = feedback?.type === 'incorrect';

  // Settings gear — placed in the same bottom-right icon row as the in-game
  // `GameInProgressPanel`, so the two screens feel identical.
  const settingsRow = (
    <div className="flex justify-end items-center gap-2 text-muted-foreground">
      <button
        type="button"
        data-tour-id="postmortem-settings"
        onClick={() => setShowSettings(true)}
        className="p-1 leading-none hover:text-foreground"
        title={t('settings')}
        aria-label={t('settings')}
      >
        <FaCog className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Bar, Board, Input, Actions */}
        <div className="lg:col-span-2">
          <div className="border border-border rounded-lg p-4">
            <div className="flex flex-col gap-6">
              {/* Progress Bar */}
              <ProgressBar current={progress} total={totalMoves} />

              {/* Board (inline, follows boardVisibility/peekMode) */}
              {inlineBoardView}

              {!isCompleted ? (
                <>
                  {/* Loading indicator during "Analyze All" */}
                  {moveInput.isAnalyzingAll ? (
                    <div className="py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        <span className="text-sm">{t('analyzing')}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Move Input */}
                      <div data-tour-id="postmortem-input">
                        <MoveInputPanel
                          preferences={preferences}
                          updatePreferences={updatePreferences}
                          currentFen={boardFen}
                          moveInput={moveInput.value}
                          onMoveInputChange={moveInput.setValue}
                          error={feedbackIsError ? feedbackMessage : null}
                          onErrorClear={moveInput.clearFeedback}
                          onSubmit={actions.handleSubmitMove}
                          inputPlaceholder={t('inputMove')}
                          selectPlaceholder={t('selectMove')}
                          toggleTitle={t('switchInputMode')}
                          playerColor={sideToMove === 'black' ? 'b' : 'w'}
                        />
                      </div>

                      {/* Correct move feedback */}
                      {feedback?.type === 'correct' && feedbackMessage && (
                        <p className="text-success text-sm mt-[-16px]">{feedbackMessage}</p>
                      )}
                      {feedback?.type === 'skipped' && feedbackMessage && (
                        <p className="text-muted-foreground text-sm mt-[-16px]">
                          {feedbackMessage}
                        </p>
                      )}

                      {/* Auto-opponent toggle (postmortem-specific) */}
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.autoOpponent}
                            onChange={(e) => settings.setAutoOpponent(e.target.checked)}
                            className="w-4 h-4 rounded border-border"
                          />
                          <span className="text-sm text-muted-foreground">
                            {t('autoOpponentMoves')}
                          </span>
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className={ACTION_ROW_CONTAINER_CLASSES}>
                        {showModalPeekButton && (
                          <ShowBoardButton onClick={() => setIsBoardVisible(true)} />
                        )}
                        <span data-tour-id="postmortem-dont-know" className="inline-flex">
                          <Button
                            variant="secondary"
                            onClick={actions.handleDontKnow}
                            icon={<FaQuestionCircle className="w-4 h-4" />}
                            className="px-4 py-2"
                          >
                            <span className={settings.dontKnowCount >= 2 ? 'hidden md:inline' : ''}>
                              {t('dontKnow')}
                            </span>
                          </Button>
                        </span>
                        {settings.dontKnowCount >= 2 && (
                          <button
                            onClick={() => setShowAnalyzeAllConfirm(true)}
                            className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center gap-2"
                          >
                            <FaCheck className="w-4 h-4" />
                            {t('autoFillAll')}
                          </button>
                        )}
                      </div>

                      {settingsRow}
                    </>
                  )}
                </>
              ) : (
                /* Completion Message */
                <>
                  <div className="py-8 text-center flex flex-col items-center gap-4">
                    <FaCheck className="w-12 h-12 text-success" />
                    <div className="flex flex-col gap-2">
                      <h3 className="text-xl font-bold">{t('completed')}</h3>
                      <p className="text-muted-foreground">
                        {navigation.selectedMoveIndex !== null ? (
                          <button
                            onClick={() => navigation.setSelectedMoveIndex(null)}
                            className="text-sm underline hover:text-foreground"
                          >
                            {t('backToCurrentPosition')}
                          </button>
                        ) : (
                          t('completedMessage')
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Show Board (modal peek mode only — inline modes already
                      render the board above) */}
                  {showModalPeekButton && (
                    <div className={ACTION_ROW_CONTAINER_CLASSES}>
                      <ShowBoardButton onClick={() => setIsBoardVisible(true)} />
                    </div>
                  )}

                  {/* Move log link */}
                  <div className="text-center">
                    <button
                      onClick={() => setShowMoveLogModal(true)}
                      className={`text-xs ${TEXT_LINK_MUTED_CLASSES}`}
                    >
                      {t('log')}
                    </button>
                  </div>

                  {settingsRow}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Move List */}
        <PostmortemMovesPanel
          formattedPgn={formattedPgn}
          currentPosition={navigation.currentPosition}
          originalMovesLength={originalMoves.length}
          currentFen={currentFen}
          displayFen={displayFen}
          startingFen={startingFen}
          onNavigateToPosition={navigation.navigateToPosition}
          onNavigateToStart={navigation.navigateToStart}
          onNavigatePrevious={navigation.navigatePrevious}
          onNavigateNext={navigation.navigateNext}
          onNavigateToEnd={navigation.navigateToEnd}
        />
      </div>

      {/* Move Log Modal */}
      <Modal
        isOpen={showMoveLogModal}
        title={t('moveLog')}
        onClose={() => setShowMoveLogModal(false)}
      >
        <PostmortemMoveLogTable entries={moveLog.entries} />
      </Modal>

      {/* Settings Modal — reuses the in-game settings form. Edits update the
          local preferences only (no persistence, no preferenceChangeLog). */}
      <MidGameSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        preferences={preferences}
        onPerGamePrefChange={handlePerGamePrefChange}
      />

      {/* Auto Fill All Confirmation Modal */}
      <ConfirmationModal
        isOpen={showAnalyzeAllConfirm}
        onCancel={() => setShowAnalyzeAllConfirm(false)}
        onConfirm={() => {
          setShowAnalyzeAllConfirm(false);
          actions.handleAnalyzeAll();
        }}
        title={t('confirmAutoFillAllTitle')}
        message={t('confirmAutoFillAllMessage')}
        confirmText={t('autoFillAll')}
        cancelText={t('cancel')}
      />

      {/* Board View Modal — used for peek + modal mode. */}
      <BoardViewModal
        isOpen={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        fen={boardFen}
        playerSide={playerColor}
        lastMove={preferences.highlightLastMove ? currentLastMove : null}
        preferences={preferences}
        movesLength={originalMoves.length}
        currentPosition={navigation.currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={navigation.navigateToStart}
        onNavigatePrevious={navigation.navigatePrevious}
        onNavigateNext={navigation.navigateNext}
        onNavigateToEnd={navigation.navigateToEnd}
        onNavigateToPosition={navigation.navigateToPosition}
      />
    </div>
  );
}
