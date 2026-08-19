'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { notFound, useSearchParams } from 'next/navigation';

import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import type { ExpInfo } from '@blindfold-chess/features/exp';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { BoardVisibility } from '@/lib/games/board-visibility';
import { writeBoardVisibilityCookieClient } from '@/lib/games/board-visibility-cookie';
import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import {
  isFinalPosition,
  resolveLosingColor,
  resolveTerminationMark,
} from '@/lib/games/termination-mark';

import { ExpGainDisplay } from '@/app/[locale]/(public)/practice/_components/ExpGainDisplay';
import { useTerminationMarkLabel } from '@/app/[locale]/_hooks/use-termination-mark-label';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useBoardFlip, useConfirmationDialogs, useMoveNavigation } from '../_hooks';
import { useAiGameExpGrant } from '../_hooks/use-ai-game-exp-grant';
import { useFinishModal } from '../_hooks/use-finish-modal';
import { useFinishedGameNavigation } from '../_hooks/use-finished-game-navigation';
import type { GameSession } from '../_hooks/use-game-session';
import { useGuestPromotion } from '../_hooks/use-guest-promotion';
import { usePeekState } from '../_hooks/use-peek-state';
import { usePlayBoardViews } from '../_hooks/use-play-board-views';
import { usePlayClientPreferences } from '../_hooks/use-play-client-preferences';
import { usePublishPromotion } from '../_hooks/use-publish-promotion';
import { useAiReplyChip } from './AiReplyChip';
import { GameFinishModal } from './GameFinishModal';
import { GameInProgressPanel } from './GameInProgressPanel';
import { MoveInputSkeleton } from './MoveInputSkeleton';
import { MovesPanel } from './MovesPanel';
import { MovesPanelSkeleton } from './MovesPanelSkeleton';
import { PlayClientModals } from './PlayClientModals';
import {
  ActionRowSkeleton,
  AlwaysVisibleBoardSkeleton,
  CompactBoardSkeleton,
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
   * Server-resolved global `boardVisibility` hint (from the
   * `bfc_board_visibility_pref` cookie). Picks the pre-hydration board
   * skeleton: the compact bar for 'never' (pure blindfold) vs the full-size
   * board for 'always' / 'peek', so a 'never' user's first paint matches the
   * hydrated layout instead of collapsing ~500px.
   */
  initialBoardVisibility: BoardVisibility;
  /**
   * Page-level "waiting for persisted state" flag, computed once in
   * `PlayPageClient` from `gameState.isLoadingFromStorage` and the
   * preferences hydration state. Passed down so the title slot and the
   * input panel transition out of their loading states in lockstep.
   */
  isInitializing: boolean;
  /** Whether the viewer is signed in — gates the finished-game Exp display. */
  isAuthenticated: boolean;
  /**
   * Already-granted AI-game Exp for this game (resolved server-side). Shown
   * under the result overlay when reviewing a finished game. Null when there
   * is nothing to show.
   */
  expInfo: ExpInfo | null;
};

export function PlayClient({
  locale,
  gameSession,
  initialMoveInputHint,
  initialBoardVisibility,
  isInitializing,
  isAuthenticated,
  expInfo,
}: Props) {
  const terminationMarkLabel = useTerminationMarkLabel();
  const searchParams = useSearchParams();
  // Opened from the result / games list with `finished=1` to review a
  // finished game in the familiar game UI (read-only). Suppresses the
  // redirect-to-result below and renders the play panel in `finished` mode.
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
    aiMoveNotation,
    aiMoveSignal,
  } = gameSession;

  const {
    playerSide,
    engineConfig,
    startingFen,
    setupPlies,
    perGamePrefs,
    initialPerGamePrefs,
    preferenceChangeLog,
    gameId,
  } = gameConfig;
  const {
    gameStatus,
    derivedStatus,
    playerResult,
    isPlayerTurn,
    isLoading,
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
        // Capture the rejected move text (in scope here) so the operation log
        // shows what was tried, not just how many times.
        recordInvalid(move);
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

  // Mirror THIS game's effective board visibility (per-game merged with global)
  // to the SSR cookie so the next /games/play paint reserves the matching board
  // skeleton for the game being resumed — not just the global default. Without
  // this, a game whose per-game visibility differs from the global setting
  // (e.g. global 'peek' but this game 'never') would shift on hydration. The
  // global default is still seeded by GamePreferencesProvider for the first-ever
  // visit; this refines it to the active game.
  useEffect(() => {
    writeBoardVisibilityCookieClient(preferences.boardVisibility);
  }, [preferences.boardVisibility]);

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

  // Whether the loaded game has reached a terminal result. When true the play
  // panel renders in `finished` mode (mutating controls disabled + overlaid,
  // board / move list still navigable) — both when a game just ended in live
  // play and when reviewing one opened from the list (`?finished=1`).
  const isFinished = gameStatus !== 'in_progress' && !!playerResult;

  // The end-of-game badge on the loser's king. Only on the final position — a
  // board scrubbed back through history is showing a game still in progress.
  // `derivedStatus` (the position's own status, not the stored one) is what
  // separates a mate from a resignation; see `resolveTerminationMark`.
  const terminationMark = useMemo(
    () =>
      isFinished && isFinalPosition(currentPosition, moves.length)
        ? resolveTerminationMark({
            fen: currentFen,
            losingColor: resolveLosingColor(playerResult, playerSide),
            isCheckmate: derivedStatus === 'checkmate',
          })
        : null,
    [isFinished, currentPosition, moves.length, currentFen, playerResult, playerSide, derivedStatus]
  );

  // Finished-game navigation hub: prefetches the result route and exposes the
  // game-finished modal's actions.
  const { handleViewResult, handleShare, openRecall, openRepertoireCheck, isShared } =
    useFinishedGameNavigation({
      locale,
      isFinishedView,
      gameId,
      formattedPgn,
      playerSide,
      moves,
      engineConfig,
      startingFen,
    });

  // Game-finished modal (Result / Game Review / Kata) — auto-open-once state
  // machine, see useFinishModal.
  const { finishModalOpen, setFinishModalOpen } = useFinishModal({
    isFinished,
    isFinishedView,
    isInitializing,
  });

  // Would publishing this win earn a rank? The grant happens at publish, not
  // at checkmate, so the finish modal is the last place to say so before the
  // player walks away from it.
  const promotionRankSlug = usePublishPromotion({
    result: playerResult,
    playSettings: initialPerGamePrefs,
    changeLog: preferenceChangeLog,
    operationLogs,
    moveCount: moves.length,
    startingFen,
    setupPlies,
    enabled: isFinished && !isFinishedView,
  });

  // The signed-out counterpart: does this game satisfy the 1kyu / 1dan game
  // requirement? Purely local — a guest has no progression to consult.
  const guestPromotionRankSlug = useGuestPromotion({
    result: playerResult,
    playSettings: initialPerGamePrefs,
    changeLog: preferenceChangeLog,
    operationLogs,
    moveCount: moves.length,
    startingFen,
    setupPlies,
    enabled: isFinished && !isFinishedView,
  });

  // Grant AI-game Exp on finish, independent of navigation (the game-finished
  // modal makes visiting the result screen optional). Once, terminal-only,
  // signed-in, outside review mode — see the hook.
  useAiGameExpGrant({
    isFinishedView,
    isFinished,
    gameId,
    isAuthenticated,
    playerResult,
    operationLogs,
    engineConfig,
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
  // The two board views (in-progress with mask/AI chip, finished read-only)
  // — assembled in usePlayBoardViews so this component keeps only wiring.
  const { inProgressBoardView, finishedBoardView } = usePlayBoardViews({
    displayFen,
    currentFen,
    playerSide,
    effectiveFlipped,
    preferences,
    lastMove,
    movesLength: moves.length,
    currentPosition,
    formattedPgn,
    navigation: {
      navigateToStart,
      navigatePrevious,
      navigateNext,
      navigateToEnd,
      navigateToPosition,
    },
    onFlipBoard: handleFlipBoard,
    boardMasked,
    onReveal: handleReveal,
    isPlayerTurn,
    isLoading,
    onBoardMove: handleBoardMove,
    onIllegalMove: recordInvalid,
    aiReply,
    aiMoveNotation,
    isAiThinking,
    canEditPerGameSettings,
    onOpenSettings: () => setShowSettingsModal(true),
    terminationMark,
    terminationMarkLabel: terminationMarkLabel(terminationMark),
  });

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
                {/* Board skeleton shape is driven by the SSR boardVisibility
                    hint: 'never' (pure blindfold) renders the compact bar — no
                    board — so reserve the matching compact skeleton; 'always' /
                    'peek' render a full-size board card. Picking the right one
                    here keeps the pre-hydration → hydrated handoff CLS-free. */}
                {initialBoardVisibility === 'never' ? (
                  <CompactBoardSkeleton />
                ) : (
                  <AlwaysVisibleBoardSkeleton />
                )}
                <MoveInputSkeleton mode={skeletonMode} hasModeSwitch={skeletonHasModeSwitch} />
                {/* Action row (Undo + Resign). */}
                <ActionRowSkeleton />
                {/* Save and Exit link: text-sm ≈ 20px */}
                <TextLinkSkeleton />
                {/* Operation Log trigger: w-4 h-4 icon + padding ≈ 24px */}
                <IconButtonSkeleton />
              </div>
            )}
            {!isInitializing && (gameStatus === 'in_progress' || isFinished) && (
              <GameInProgressPanel
                finished={isFinished}
                finishedResult={playerResult}
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
                // A finished game is being reviewed, not played: show the plain
                // read-only board (no blindfold mask / peek) instead of the
                // in-progress board with its move-input wiring.
                inlineBoardView={isFinished ? finishedBoardView : inProgressBoardView}
                // Earned Exp, shown under the result overlay in finished review.
                // Signed-in only; ExpGainDisplay itself renders nothing when the
                // Exp is null (guest / in-progress / not-yet-granted game).
                finishedFooter={isAuthenticated ? <ExpGainDisplay expInfo={expInfo} /> : undefined}
                // "Next action" button in the finished overlay reopens the modal.
                onNextAction={isFinished ? () => setFinishModalOpen(true) : undefined}
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
              operations={{ logs: operationLogs, playerSide, setupPlies }}
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
        startingFen={startingFen}
        canEditPerGameSettings={canEditPerGameSettings}
        showSettingsModal={showSettingsModal}
        onCloseSettingsModal={() => setShowSettingsModal(false)}
        onPerGamePrefChange={setPerGamePref}
      />

      {/* Pick where to go next (Result / Game Review / Kata). Auto-opens on live
          finish; reopened via the finished board's "Next action" button. */}
      <GameFinishModal
        isOpen={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        result={playerResult}
        onReview={handleViewResult}
        onRecall={openRecall}
        onRepertoireCheck={openRepertoireCheck}
        published={isShared}
        promotionRankSlug={promotionRankSlug}
        guestPromotionRankSlug={guestPromotionRankSlug}
        guestSignUpHref={`/${locale}/sign-up`}
        onShare={handleShare}
      />
    </div>
  );
}
