'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, ProgressBar } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaCheck, FaCog, FaQuestionCircle, FaSpinner } from 'react-icons/fa';

import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { MidGameSettingsModal } from '@/app/[locale]/(public)/games/play/_components/MidGameSettingsModal';
import { ACTION_ROW_CONTAINER_CLASSES } from '@/app/[locale]/(public)/games/play/_lib';
import { useLoadGame } from '@/app/[locale]/(public)/games/play/result/_hooks/useLoadGame';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

import { usePostmortemGame } from '../_hooks';
import { computeRecallStats } from '../_lib';
import { formatMoveNumberPrefix } from '../_lib/postmortem-format';
import { PostmortemMovesPanel } from './PostmortemMovesPanel';
import { PostmortemSummary } from './PostmortemSummary';

/**
 * Move-feedback surfaced in the page title (mirrors the in-game play screen,
 * which shows live status as the H1). `tone` drives the title color.
 */
export type PostmortemFeedback = {
  tone: 'correct' | 'incorrect' | 'skipped';
  text: string;
};

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
  /**
   * Reports the latest move feedback up to the page title owner so it can be
   * rendered in the `PageTitle` slot (like the play screen surfaces its move
   * status there). Null clears the title back to the page name.
   */
  onFeedbackChange?: (feedback: PostmortemFeedback | null) => void;
  /**
   * Reports whether the review has been completed, so the page owner can hide
   * chrome that only makes sense mid-review (e.g. the help tour, whose targets
   * are gone once the summary replaces the input/settings/moves panels).
   */
  onCompletedChange?: (completed: boolean) => void;
  /** Restart the review from the beginning (parent remounts the game). */
  onRestart?: () => void;
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
    showPieceDestinations: perGame.showPieceDestinations ?? global.showPieceDestinations,
    showOwnPieces: perGame.showOwnPieces,
    showOpponentPieces: perGame.showOpponentPieces,
    pieceShapeMode: perGame.pieceShapeMode,
    pieceColors: perGame.pieceColors,
    pawnHideMode: perGame.pawnHideMode ?? global.pawnHideMode,
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
  onFeedbackChange,
  onCompletedChange,
  onRestart,
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
  const [showAnalyzeAllConfirm, setShowAnalyzeAllConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { currentFen, displayFen, currentLastMove } = boardState;
  const { isCompleted, totalMoves, progress, originalMoves } = gameProgress;

  const recallStats = computeRecallStats(moveLog.entries);

  // Revisit a stumbled move from the completion summary: jump to its position.
  // The board is always visible here, so it simply updates to that position.
  const handleMistakeClick = useCallback(
    (entry: Parameters<typeof actions.handleMoveClick>[0]) => {
      actions.handleMoveClick(entry);
    },
    [actions]
  );

  const boardFen = displayFen || currentFen;
  const sideToMove = boardFen.split(' ')[1] === 'b' ? 'black' : 'white';
  // Board-driven input is available in always-visible mode at the live
  // position whenever it's a move the reviewer is expected to enter
  // (`isPlayerTurn` already encodes the auto-opponent rule). Unlike a real
  // game, the reviewer enters BOTH sides' moves, so the board is set to
  // `movablePieces="side-to-move"` below — letting them grab the opponent's
  // pieces on the opponent's turn.
  // Postmortem is a review surface: the board is always visible (no blindfold
  // mask / peek). Board-driven input is available at the live position whenever
  // it's a move the reviewer is expected to enter (`isPlayerTurn` encodes the
  // auto-opponent rule). The reviewer enters BOTH sides' moves, so the board is
  // `movablePieces="side-to-move"`.
  const canBoardInput =
    !isCompleted &&
    !moveInput.isAnalyzingAll &&
    navigation.currentPosition === -1 &&
    settings.isPlayerTurn;

  const inlineBoardView = (
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
      alwaysOpen
      movablePieces="side-to-move"
      onMove={
        canBoardInput ? (san) => actions.handleSubmitMove(san as AlgebraicNotation) : undefined
      }
    />
  );

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

  // Surface the feedback in the page title (the play screen does the same with
  // its move status). Incorrect moves get a ⚠ prefix, matching the in-game
  // "invalid move" title. The message persists until the next input clears it.
  useEffect(() => {
    if (!onFeedbackChange) return;
    if (!feedback || !feedbackMessage) {
      onFeedbackChange(null);
      return;
    }
    onFeedbackChange({
      tone: feedback.type,
      text: feedback.type === 'incorrect' ? `⚠ ${feedbackMessage}` : feedbackMessage,
    });
  }, [onFeedbackChange, feedback, feedbackMessage]);

  // Let the page owner react to completion (used to hide the help tour, whose
  // targets disappear once the summary replaces the live review panels).
  useEffect(() => {
    onCompletedChange?.(isCompleted);
  }, [onCompletedChange, isCompleted]);

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

              {/* Board (always visible — postmortem is a review surface) */}
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
                          showInlineError={false}
                          success={feedback?.type === 'correct'}
                        />
                      </div>

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
                /* Completion: recall report + stumble review + next actions */
                <>
                  <PostmortemSummary
                    stats={recallStats}
                    entries={moveLog.entries}
                    onEntryClick={handleMistakeClick}
                    onRestart={onRestart ?? (() => {})}
                    gameId={gameId}
                  />

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
    </div>
  );
}
