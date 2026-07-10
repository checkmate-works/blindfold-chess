'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { Button, ProgressBar } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaArrowRight, FaCheck, FaQuestionCircle, FaSpinner } from 'react-icons/fa';

import { BoardSettingsButton } from '@/app/[locale]/(public)/games/play/_components/BoardSettingsButton';
import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { MidGameSettingsModal } from '@/app/[locale]/(public)/games/play/_components/MidGameSettingsModal';
import { usePeekState } from '@/app/[locale]/(public)/games/play/_hooks/use-peek-state';
import { useQuickPeekModal } from '@/app/[locale]/(public)/games/play/_hooks/use-quick-peek-modal';
import { ACTION_ROW_CONTAINER_CLASSES } from '@/app/[locale]/(public)/games/play/_lib';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';

import { useRecallGame } from '../_hooks';
import { useOpponentMoveAnnouncement } from '../_hooks/use-opponent-move-announcement';
import { useRecallPreferences } from '../_hooks/use-recall-preferences';
import type { MoveLogEntry } from '../_lib';
import { computeRecallStats, resolveModalPosition } from '../_lib';
import { formatMoveNumberPrefix } from '../_lib/recall-format';
import { RecallMovesPanel } from './RecallMovesPanel';
import { RecallOpponentMoveChip } from './RecallOpponentMoveChip';
import { RecallSummary } from './RecallSummary';

/**
 * Move-feedback surfaced in the page title (mirrors the in-game play screen,
 * which shows live status as the H1). `tone` drives the title color.
 */
export type RecallFeedback = {
  tone: 'correct' | 'incorrect' | 'skipped';
  text: string;
};

/**
 * Recall's preferences are ephemeral (never persisted — see
 * useRecallPreferences), so there is no peek-count ledger for `usePeekState`
 * to record into, unlike play's `MoveOperationLog.peekCount`.
 */
const noOpRecordPeek = () => {};

type Props = {
  pgn: string;
  /** Pre-parsed SAN move list, taking precedence over `pgn` when present. See `useRecallInit`. */
  moves?: AlgebraicNotation[];
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
  startingFen?: string;
  /**
   * Saved-game id (from the recall deep-link). Used to seed the initial
   * board/input settings from the game's `gamePreferences` snapshot.
   */
  gameId?: string;
  /**
   * Reports the latest move feedback up to the page title owner so it can be
   * rendered in the `PageTitle` slot (like the play screen surfaces its move
   * status there). Null clears the title back to the page name.
   */
  onFeedbackChange?: (feedback: RecallFeedback | null) => void;
  /**
   * Reports whether the review has been completed, so the page owner can hide
   * chrome that only makes sense mid-review (e.g. the help tour, whose targets
   * are gone once the summary replaces the input/settings/moves panels).
   */
  onCompletedChange?: (completed: boolean) => void;
  /** Restart the review from the beginning (parent remounts the game). */
  onRestart?: () => void;
  /**
   * `content-bottom` ad slot, resolved server-side by the page owner and
   * threaded down here. Rendered below the Moves panel once the review is
   * complete — this screen has no other trailing content, so this position
   * doubles as the page's de-facto content-bottom placement.
   */
  adBanner?: ReactNode;
};

export function RecallClient({
  pgn,
  moves,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
  startingFen,
  gameId,
  onFeedbackChange,
  onCompletedChange,
  onRestart,
  adBanner,
}: Props) {
  const t = useTranslations('recall');

  const {
    gameProgress,
    boardState,
    moveInput,
    moveLog,
    settings,
    navigation,
    actions,
    formattedPgn,
  } = useRecallGame({
    pgn,
    moves,
    playerColor,
    autoOpponent: initialAutoOpponent,
    initialOffset,
    startingFen,
  });

  // Recall's ephemeral local preferences (seeded from the saved game's
  // snapshot, never written back) — see useRecallPreferences.
  const {
    preferences,
    updatePreferences,
    handlePerGamePrefChange,
    initialPlaySettings,
    preferenceChangeLog,
  } = useRecallPreferences({
    gameId,
    currentMoveIndex: gameProgress.currentMoveIndex,
  });

  // UI-only state (modal visibility)
  const [showAnalyzeAllConfirm, setShowAnalyzeAllConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { currentFen, displayFen, currentLastMove, gamePositions } = boardState;
  const { isCompleted, totalMoves, progress, originalMoves } = gameProgress;

  const recallStats = computeRecallStats(moveLog.entries);

  // Revisit a stumbled move from the completion summary: open a quick-peek
  // modal previewing that position, matching games/play/result's "By Move"
  // strip. Same hook as GameReview's — an independent nav so opening it never
  // disturbs the live board's own position, plus the "commit to live" action
  // behind the modal footer's "Open this position".
  const lastMoveAt = useCallback(
    (position: number) =>
      gamePositions[position === -1 ? originalMoves.length : position + 1]?.lastMove ?? null,
    [gamePositions, originalMoves.length]
  );
  const quickPeek = useQuickPeekModal({
    notationMoves: originalMoves,
    startingFen,
    lastMoveAt,
    navigateToPosition: navigation.navigateToPosition,
  });
  const openQuickPeek = useCallback(
    (entry: MoveLogEntry) => quickPeek.openAtMove(resolveModalPosition(entry, moveLog.entries)),
    [quickPeek, moveLog.entries]
  );

  const boardFen = displayFen || currentFen;
  const sideToMove = boardFen.split(' ')[1] === 'b' ? 'black' : 'white';
  // Recall now mirrors play's blindfold semantics exactly: `boardVisibility`
  // (always/peek/never) drives the same mask/peek overlay as the play
  // screen, and `showOwnPieces` / `showOpponentPieces` / `pawnHideMode` pass
  // straight through from `preferences` — a blindfold game reviewed here
  // re-hides what the game itself hid, since recall is a memory exercise
  // (the reviewer enters both sides' moves) rather than a passive replay.
  // See the `usePeekState` wiring below for the mask itself. The reviewer
  // enters BOTH sides' moves, so the board is `movablePieces="side-to-move"`.
  const { boardMasked, handleRevealBoard, remask } = usePeekState({
    boardVisibility: preferences.boardVisibility,
    recordPeek: noOpRecordPeek,
  });
  // Re-mask after every committed move, mirroring play's remask() calls at
  // its move-commit sites. Recall funnels moves through four paths (correct
  // guess, "don't know", auto-opponent, and the analyze-all bulk fill) that
  // all advance `currentMoveIndex` exactly once per commit, so watching it
  // here covers all four without touching each call site individually.
  useEffect(() => {
    remask();
  }, [gameProgress.currentMoveIndex, remask]);
  // The completion/summary view — including a position adopted from the
  // quick-peek modal's "Open this position" — always shows the board
  // unmasked, mirroring play's separate `finishedBoardView`, which never
  // re-hides a finished game. `inlineBoardView` below is shared by both the
  // in-progress and completed JSX branches, so this gate is what keeps the
  // summary view from inheriting the mid-session mask.
  const isBoardMaskActive = !isCompleted && boardMasked;

  // Announce the opponent's auto-filled move (from "Auto-fill opponent's
  // moves") via an on-board chip, mirroring games/play's AiReplyChip.
  const {
    notation: opponentMoveNotation,
    active: opponentChipActive,
    dismiss: dismissOpponentChip,
  } = useOpponentMoveAnnouncement({
    entries: moveLog.entries,
    durationMs: preferences.aiReplyDuration,
  });
  // Only surface the chip while masked — once the board is visible the
  // opponent's move is already readable on the board itself (same reasoning
  // as AiReplyChip's own gating on the play screen).
  const showOpponentChip = isBoardMaskActive;
  // Revealing the board (peek) also dismisses the chip: once the board is
  // visible again there's no need for the announcement.
  const handleReveal = useCallback(() => {
    handleRevealBoard();
    dismissOpponentChip();
  }, [handleRevealBoard, dismissOpponentChip]);

  const canBoardInput =
    !isCompleted &&
    !moveInput.isAnalyzingAll &&
    navigation.currentPosition === -1 &&
    settings.isPlayerTurn &&
    !isBoardMaskActive;

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
      masked={isBoardMaskActive}
      maskDismissable={!isCompleted && preferences.boardVisibility === 'peek'}
      onReveal={handleReveal}
      movablePieces="side-to-move"
      onMove={
        canBoardInput ? (san) => actions.handleSubmitMove(san as AlgebraicNotation) : undefined
      }
      // Settings gear pinned to the board's top-right corner, matching
      // games/play's BoardSettingsButton placement exactly (recall has no
      // legacy-game gate on editability, so it's always shown here).
      topRightControl={
        <BoardSettingsButton onClick={() => setShowSettings(true)} dataTourId="recall-settings" />
      }
      boardBadge={
        showOpponentChip ? (
          <RecallOpponentMoveChip active={opponentChipActive} moveNotation={opponentMoveNotation} />
        ) : undefined
      }
      badgeActive={showOpponentChip && opponentChipActive}
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

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Bar, Board, Input, Actions */}
        <div className="lg:col-span-2" ref={quickPeek.boardColumnRef}>
          <div className="border border-border rounded-lg p-4">
            <div className="flex flex-col gap-6">
              {/* Progress Bar */}
              <ProgressBar current={progress} total={totalMoves} />

              {/* Board (always present; blindfold mask driven by boardVisibility, same as play) */}
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
                      <div data-tour-id="recall-input" className="flex flex-col gap-6">
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

                      {/* Auto-opponent toggle (recall-specific) */}
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
                        <span data-tour-id="recall-dont-know" className="inline-flex">
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
                    </>
                  )}
                </>
              ) : (
                /* Completion: recall report + stumble review + next actions */
                <RecallSummary
                  stats={recallStats}
                  entries={moveLog.entries}
                  onEntryClick={openQuickPeek}
                  onRestart={onRestart ?? (() => {})}
                  gameId={gameId}
                  initialPlaySettings={initialPlaySettings}
                  preferenceChangeLog={preferenceChangeLog}
                />
              )}
            </div>
          </div>
        </div>

        {/* Move List, plus — once completed — the ad below it. Grouped in one
            column so the ad sits directly under the Moves panel on desktop
            without disturbing the board|moves grid, and simply follows Moves
            when the grid stacks to a single column on mobile. */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <RecallMovesPanel
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

          {isCompleted && adBanner}
        </div>
      </div>

      {/* Settings Modal — reuses the in-game settings form. Edits update the
          local preferences only; never persisted, but display-relevant edits
          ARE tracked into an in-memory preferenceChangeLog for the summary's
          Change Log (see useRecallPreferences). */}
      <MidGameSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        preferences={preferences}
        onPerGamePrefChange={handlePerGamePrefChange}
      />

      {/* Quick-peek modal — previews a stumbled move's position without
          disturbing the live board, matching games/play/result's "By Move"
          strip. The footer's "Open this position" adopts the previewed
          position onto the live board, same as GameReview's own commit. */}
      <BoardViewModal
        isOpen={quickPeek.isOpen}
        onClose={quickPeek.close}
        fen={quickPeek.nav.displayFen ?? quickPeek.nav.latestFen}
        playerSide={playerColor}
        lastMove={quickPeek.lastMove}
        preferences={preferences}
        movesLength={originalMoves.length}
        currentPosition={quickPeek.nav.currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={quickPeek.nav.navigateToStart}
        onNavigatePrevious={quickPeek.nav.navigatePrevious}
        onNavigateNext={quickPeek.nav.navigateNext}
        onNavigateToEnd={quickPeek.nav.navigateToEnd}
        onNavigateToPosition={quickPeek.nav.navigateToPosition}
        footer={
          <button
            type="button"
            onClick={quickPeek.commit}
            className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t('openPosition')}
            <FaArrowRight className="h-3 w-3" aria-hidden />
          </button>
        }
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
