'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { notFound, useSearchParams } from 'next/navigation';

import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useBoardFlip, useConfirmationDialogs, useMoveNavigation } from '../_hooks';
import { useFinishedGameNavigation } from '../_hooks/use-finished-game-navigation';
import type { GameSession } from '../_hooks/use-game-session';
import { usePeekState } from '../_hooks/use-peek-state';
import { usePlayClientPreferences } from '../_hooks/use-play-client-preferences';
import { AiReplyChip, useAiReplyChip } from './AiReplyChip';
import { BoardSettingsButton } from './BoardSettingsButton';
import { FinishedGamePanel } from './FinishedGamePanel';
import { GameInProgressPanel } from './GameInProgressPanel';
import { InlineBoardView } from './InlineBoardView';
import { MoveInputSkeleton } from './MoveInputSkeleton';
import { MovesPanel } from './MovesPanel';
import { MovesPanelSkeleton } from './MovesPanelSkeleton';
import { PlayClientModals } from './PlayClientModals';
import {
  ActionRowSkeleton,
  AlwaysVisibleBoardSkeleton,
  IconButtonSkeleton,
  TextLinkSkeleton,
} from './skeletons';

type Props = {
  locale: Locale;
  gameSession: GameSession;
  /**
   * Server-resolved hint for the user's move-input mode preference. Used
   * to pick the correct `MoveInputSkeleton` shape during the SSR +
   * pre-hydration window, before `GamePreferencesContext` has read
   * localStorage. Once `isHydrated` flips true, the real preferences
   * from localStorage take over — see `skeletonMode` below.
   */
  initialMoveInputHint: MoveInputPreferenceHint;
  /**
   * Page-level "waiting for persisted state" flag, computed once in
   * `PlayPageClient` from `gameState.isLoadingFromStorage` and the
   * preferences hydration state. Passed down so the title slot and the
   * input panel transition out of their loading states in lockstep.
   */
  isInitializing: boolean;
};

export function PlayClient({ locale, gameSession, initialMoveInputHint, isInitializing }: Props) {
  const searchParams = useSearchParams();
  // Opened from the result / games list with `finished=1` to review a
  // finished game in the familiar game UI (read-only). Suppresses the
  // redirect-to-result below and switches the render to FinishedGamePanel.
  const isFinishedView = searchParams.get('finished') === '1';

  const {
    gameConfig,
    gameState,
    moveState,
    moveInput,
    aiMoveError,
    actions,
    operationLogs,
    isAiThinking,
    aiMoveDisplay,
    aiMoveSignal,
  } = gameSession;

  const {
    playerSide,
    engineConfig,
    startingFen,
    perGamePrefs,
    initialPerGamePrefs,
    preferenceChangeLog,
    gameId,
  } = gameConfig;
  const { gameStatus, playerResult, isPlayerTurn, isLoading, lastMove, gameNotFound } = gameState;
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
    recordInvalid,
    setPerGamePref,
  } = actions;

  // Wraps handleSubmitMove for the MoveInputPanel path: when a text /
  // select / button submission is rejected (`=== false` return), bump the
  // invalid-attempt counter so the operation-log entry for the eventual
  // successful move reflects how many tries it took. Board-driven moves
  // (handleBoardMove) use the raw handleSubmitMove — ChessBoard only
  // emits legal moves, so a rejection there is a race / dedup and not a
  // user mistake worth recording.
  const handleSubmitMoveTracked = useCallback(
    (move: AlgebraicNotation): boolean | void | Promise<void> => {
      const result = handleSubmitMove(move);
      if (result === false) {
        recordInvalid();
      }
      return result;
    },
    [handleSubmitMove, recordInvalid]
  );

  const { preferences, updatePreferences, skeletonMode, skeletonHasModeSwitch } =
    usePlayClientPreferences({
      perGamePrefs,
      initialMoveInputHint,
    });

  // UI state
  const [showOperationLogModal, setShowOperationLogModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Mid-game settings editing is gated on the presence of an initial
  // per-game snapshot — without one (legacy games saved before that field
  // existed) there is no baseline to layer edits against, and
  // `setPerGamePref` would silently no-op. Hide the gear icon instead of
  // surfacing an inert affordance.
  const canEditPerGameSettings = initialPerGamePrefs !== undefined;

  // Blindfold peek/mask state for the always-present board (reveal counts a
  // peek; `remask` re-covers it on the next move).
  const { boardMasked, handleRevealBoard, remask } = usePeekState({
    boardVisibility: preferences.boardVisibility,
    recordPeek,
  });
  const handleMoveCommitted = useCallback(
    (inputMethod: Parameters<typeof commitMoveLog>[0]) => {
      commitMoveLog(inputMethod);
      // Re-mask after each player move so the opponent's reply stays unseen
      // until the next deliberate peek (blindfold semantics).
      remask();
    },
    [commitMoveLog, remask]
  );

  // Board-driven move handler — wired to InlineBoardView whenever the board is
  // currently visible (always mode, or a revealed peek) AND the player can act
  // right now (their turn, no pending AI move, not browsing history). The board
  // interaction (click-to-move + DnD) produces an already-legal SAN string, so
  // we pass it straight to `handleSubmitMove` which runs the normal validation
  // + commit pipeline. The log tag is `'board'` so the audit table can
  // distinguish click/drag-driven moves from text/select/button input methods.
  // Re-mask afterwards (a no-op in 'always' mode) so a peeked move hides the
  // board again for the opponent's reply, same as a panel-submitted move.
  const handleBoardMove = useCallback(
    (san: string) => {
      const submitted = handleSubmitMove(san as AlgebraicNotation);
      if (submitted !== false) {
        commitMoveLog('board');
        remask();
      }
    },
    [handleSubmitMove, commitMoveLog, remask]
  );

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

  // Whether the loaded game has reached a terminal result.
  const isFinished = gameStatus !== 'in_progress' && !!playerResult;

  // Finished-game navigation hub: auto-redirect to the result page on game end
  // (unless reviewing), plus the result / members-only postmortem cross-links.
  const { handleViewResult, openPostmortem, isAuthModalOpen, closeAuthModal } =
    useFinishedGameNavigation({
      locale,
      isFinished,
      isFinishedView,
      gameId,
      formattedPgn,
      playerSide,
      moves,
      engineConfig,
      startingFen,
    });

  // AI-reply chip visibility (thinking + transient post-move window). Lifted
  // here so `badgeActive` can also tell the board to drop the mask's own label.
  const aiReply = useAiReplyChip({
    isAiThinking,
    aiMoveSignal,
    durationMs: preferences.aiReplyDuration,
  });
  const { dismiss: dismissAiReply } = aiReply;
  // Revealing the board (peek) also dismisses the AI-move announcement: once the
  // player can see the position the "AI played …" chip is redundant, and with
  // the "keep visible" duration it would otherwise linger over the open board.
  const handleReveal = useCallback(() => {
    handleRevealBoard();
    dismissAiReply();
  }, [handleRevealBoard, dismissAiReply]);
  // Only surface the on-board AI chip in blindfold modes. When the board is
  // always visible ('always'), the AI's move is right there on the board — an
  // "AI played …" badge would just be redundant clutter.
  const showAiReplyChip = preferences.boardVisibility !== 'always';

  // In-progress board: always rendered at a fixed position/size, with the
  // blindfold expressed as a mask overlay rather than as a different layout.
  // 'always' → unmasked; 'peek' → masked until tapped (re-masks on the next
  // move); 'never' → permanently masked. Click/drag move input is enabled
  // whenever the board is actually visible — 'always' mode OR a revealed peek
  // (`!boardMasked`) — on the player's turn, so a peeked board is as
  // operable as an always-visible one.
  const canBoardMove = !boardMasked && isPlayerTurn && !isLoading && currentPosition === -1;
  const inProgressBoardView = (
    <InlineBoardView
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
      alwaysOpen
      masked={boardMasked}
      maskDismissable={preferences.boardVisibility === 'peek'}
      onReveal={handleReveal}
      onMove={canBoardMove ? handleBoardMove : undefined}
      onIllegalMove={canBoardMove ? recordInvalid : undefined}
      // AI reply surfaced on the board itself (visible without scrolling to the
      // page title): "thinking…" while computing, then the move, which fades.
      // While the chip is active it owns the board center; `badgeActive` tells
      // the mask to drop its own label so the two don't stack.
      boardBadge={
        showAiReplyChip ? (
          <AiReplyChip
            active={aiReply.active}
            thinking={aiReply.thinking}
            aiMoveDisplay={aiMoveDisplay}
          />
        ) : undefined
      }
      badgeActive={showAiReplyChip && aiReply.active}
      // In 'always' mode the board is visible (no mask, no AI-reply chip), so a
      // slow engine looks indistinguishable from a freeze. Surface a "thinking"
      // overlay while the AI computes. In blindfold modes the masked board +
      // AiReplyChip already cover this, so this stays off there.
      aiThinking={preferences.boardVisibility === 'always' && isAiThinking}
      // Per-game settings gear, pinned to the board's top-right (move-list strip
      // end when shown, mask top-right when masked). Hidden for legacy games
      // with no per-game snapshot to edit. Game details stays in the panel.
      topRightControl={
        canEditPerGameSettings ? (
          <BoardSettingsButton onClick={() => setShowSettingsModal(true)} />
        ) : undefined
      }
    />
  );

  // Finished-game review board (read-only): always show the board. A finished
  // game is being reviewed, not played, so there is no blindfold mask or peek
  // here — the board is simply visible.
  const finishedBoardView = (
    <InlineBoardView
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
      alwaysOpen
    />
  );

  if (gameNotFound) {
    notFound();
  }

  return (
    <div>
      {/* `-mt-4 sm:mt-0` cancels PagePanel's mobile top padding (`p-4`) so the
          full-bleed board (it already cancels the side padding via `-mx-4`)
          also reaches the top edge — otherwise the leftover ~16px reads as an
          odd gap above an edge-to-edge board. Desktop keeps the intentional
          panel margin (`sm:p-6 md:p-8`). Mirrored in `loading.tsx`. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-4 sm:mt-0">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <div>
            {/* In Progress Content */}
            {gameStatus === 'in_progress' && isInitializing && (
              <div className="flex flex-col gap-6">
                {/* The board is always rendered at a fixed size now (the
                    blindfold is a mask overlay, not a different layout), so the
                    skeleton always reserves the full-size board card — no
                    peek-hint branching, no modal "Show Board" button slot. */}
                <AlwaysVisibleBoardSkeleton />
                <MoveInputSkeleton mode={skeletonMode} hasModeSwitch={skeletonHasModeSwitch} />
                {/* Action row (Undo + Resign). */}
                <ActionRowSkeleton />
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
                isAiThinking={isAiThinking}
                preferences={preferences}
                updatePreferences={updatePreferences}
                currentFen={currentFen}
                moveInput={moveInputValue}
                setMoveInput={setMoveInput}
                error={error}
                onErrorClear={clearMoveError}
                handleSubmitMove={handleSubmitMoveTracked}
                moves={moves}
                confirmationDialogs={confirmationDialogs}
                playerColor={playerSide === 'black' ? 'b' : 'w'}
                onMoveCommitted={handleMoveCommitted}
                onMovePeek={recordMovePeek}
                // Route MoveInputPanel's mode toggle through the per-game
                // change-log machinery instead of mutating the user's global
                // moveInputMode default. Same pattern as boardVisibility /
                // peekMode — mid-game switches are session-scoped, not a
                // global preference change.
                setMoveInputMode={(mode) => setPerGamePref('moveInputMode', mode)}
                onShowOperationLog={() => setShowOperationLogModal(true)}
                aiMoveError={
                  aiMoveError.message
                    ? { message: aiMoveError.message, retry: aiMoveError.retry }
                    : null
                }
                inlineBoardView={inProgressBoardView}
              />
            )}
            {!isInitializing && isFinishedView && isFinished && (
              <FinishedGamePanel
                inlineBoardView={finishedBoardView}
                onViewResult={handleViewResult}
                onPostmortem={openPostmortem}
                showPostmortem={moves.length > 0}
                onShowOperationLog={() => setShowOperationLogModal(true)}
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
              operations={{ logs: operationLogs, playerSide }}
              showBackground={false}
            />
          )}
        </div>
      </div>

      <PlayClientModals
        confirmationDialogs={confirmationDialogs}
        preferences={preferences}
        showOperationLogModal={showOperationLogModal}
        onCloseOperationLog={() => setShowOperationLogModal(false)}
        engineConfig={engineConfig}
        initialPerGamePrefs={initialPerGamePrefs}
        preferenceChangeLog={preferenceChangeLog}
        canEditPerGameSettings={canEditPerGameSettings}
        showSettingsModal={showSettingsModal}
        onCloseSettingsModal={() => setShowSettingsModal(false)}
        onPerGamePrefChange={setPerGamePref}
      />

      {/* Sign-up prompt shown when an anonymous viewer taps the postmortem
          button in the finished-game panel (members-only feature). */}
      {isAuthModalOpen && <AuthPromptModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />}
    </div>
  );
}
