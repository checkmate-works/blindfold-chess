'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { notFound, useRouter, useSearchParams } from 'next/navigation';

import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import type { Locale } from '@/app/[locale]/_lib/types';

import { useBoardFlip, useConfirmationDialogs, useMoveNavigation } from '../_hooks';
import type { GameSession } from '../_hooks/use-game-session';
import { usePlayClientPreferences } from '../_hooks/use-play-client-preferences';
import {
  buildPostmortemPath,
  shouldShowAlwaysVisibleBoard,
  shouldShowInlinePeekHeader,
} from '../_lib';
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
  InlineBoardHeaderSkeleton,
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
   * Server-resolved hint for the user's board-peek preferences
   * (`peekMode`, `boardVisibility`). Used to decide whether to
   * reserve the `InlineBoardHeaderSkeleton` / `ActionRowSkeleton` board
   * button during the SSR + pre-hydration window, before
   * `GamePreferencesContext` has read localStorage. Once `isHydrated`
   * flips true, the real preferences from localStorage take over —
   * see `skeletonShowInlinePeekHeader` / `skeletonShowModalPeekButton`
   * below.
   */
  initialPeekHint: PeekPreferenceHint;
  /**
   * Page-level "waiting for persisted state" flag, computed once in
   * `PlayPageClient` from `gameState.isLoadingFromStorage` and the
   * preferences hydration state. Passed down so the title slot and the
   * input panel transition out of their loading states in lockstep.
   */
  isInitializing: boolean;
};

export function PlayClient({
  locale,
  gameSession,
  initialMoveInputHint,
  initialPeekHint,
  isInitializing,
}: Props) {
  const router = useRouter();
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

  const {
    preferences,
    updatePreferences,
    skeletonMode,
    skeletonHasModeSwitch,
    skeletonShowAlwaysVisibleBoard,
    skeletonShowInlinePeekHeader,
    skeletonShowModalPeekButton,
  } = usePlayClientPreferences({
    perGamePrefs,
    initialMoveInputHint,
    initialPeekHint,
  });

  // UI state
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [showOperationLogModal, setShowOperationLogModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Mid-game settings editing is gated on the presence of an initial
  // per-game snapshot — without one (legacy games saved before that field
  // existed) there is no baseline to layer edits against, and
  // `setPerGamePref` would silently no-op. Hide the gear icon instead of
  // surfacing an inert affordance.
  const canEditPerGameSettings = initialPerGamePrefs !== undefined;

  // Bumped once per successful player move commit. Drives the inline peek
  // accordion's auto-collapse so each move requires a fresh expand, matching
  // the modal mode's "1 open action = 1 peek" semantics. Also drives the
  // scroll-to-top effect below for peek+inline users.
  const [playerMoveCommitCount, setPlayerMoveCommitCount] = useState(0);
  const handleMoveCommitted = useCallback(
    (inputMethod: Parameters<typeof commitMoveLog>[0]) => {
      commitMoveLog(inputMethod);
      setPlayerMoveCommitCount((n) => n + 1);
    },
    [commitMoveLog]
  );

  // Scroll back to PageTitle after a player move commit while in peek+inline
  // mode. The inline board auto-collapses on commit (so the area the user
  // was looking at disappears) and the "AI is thinking" status lives in the
  // PageTitle at the top — bringing it into the first view makes that
  // status immediately visible without the user having to scroll back up.
  // Modal-peek and always-visible modes don't need this: modal users have
  // no expand area to obscure the title, and always-visible users have the
  // board on-screen continuously anyway.
  //
  // Read the latest `peek+inline` predicate via a ref so the effect's only
  // re-trigger is the commit counter — otherwise unrelated preference
  // changes (piece colors, theme, etc.) would also cause a scroll.
  //
  // The scroll is dispatched via `requestAnimationFrame` so the inline
  // board's auto-collapse layout shift (which removes the board element
  // from the DOM and reduces document height) flushes BEFORE the smooth
  // scroll begins. Without that deferral, some browsers cancel the
  // in-flight smooth animation when the document height drops underneath
  // it, leaving the page stuck at its original scroll position — exactly
  // the symptom users observed.
  const peekInlineModeRef = useRef(shouldShowInlinePeekHeader(preferences));
  peekInlineModeRef.current = shouldShowInlinePeekHeader(preferences);
  useEffect(() => {
    if (playerMoveCommitCount === 0) return; // skip initial mount
    if (!peekInlineModeRef.current) return;
    const id = requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [playerMoveCommitCount]);

  // Board-driven move handler — only wired through to InlineBoardView when
  // the always-visible board is being rendered AND the player can actually
  // move right now (their turn, no pending AI move, not browsing history).
  // The board interaction (click-to-move + DnD) produces an already-legal
  // SAN string, so we pass it straight to `handleSubmitMove` which runs
  // the normal validation + commit pipeline.
  //
  // We commit the operation log entry directly here (rather than going
  // through `handleMoveCommitted` like MoveInputPanel does) because board
  // moves only happen in always-visible mode — the auto-collapse and
  // scroll-to-title side effects of `handleMoveCommitted` are not relevant
  // there. The log tag is `'board'` so the audit table can distinguish
  // click/drag-driven moves from text/select/button input methods.
  const handleBoardMove = useCallback(
    (san: string) => {
      const submitted = handleSubmitMove(san as AlgebraicNotation);
      if (submitted !== false) {
        commitMoveLog('board');
      }
    },
    [handleSubmitMove, commitMoveLog]
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

  // Redirect to result page when the game ends — UNLESS we are intentionally
  // reviewing a finished game (`finished=1`), in which case we stay here and
  // render the read-only FinishedGamePanel.
  useEffect(() => {
    if (isFinishedView) return;
    if (isFinished && gameId) {
      router.replace(`/${locale}/games/play/result?gameId=${gameId}`);
    }
  }, [isFinishedView, isFinished, gameId, locale, router]);

  // Cross-links out of the finished-game view → result and postmortem,
  // completing the result ⇄ game ⇄ postmortem navigation hub.
  const handleViewResult = useCallback(() => {
    if (gameId) router.push(`/${locale}/games/play/result?gameId=${gameId}`);
  }, [router, locale, gameId]);

  const handleOpenPostmortem = useCallback(() => {
    if (!gameId) return;
    router.push(
      buildPostmortemPath({
        locale,
        formattedPgn,
        playerColor: playerSide,
        moves,
        engineConfig,
        gameId,
        startingFen,
      })
    );
  }, [router, locale, formattedPgn, playerSide, moves, engineConfig, gameId, startingFen]);

  // Build the InlineBoardView shared by the in-progress and finished panels.
  // `interactive` enables click/drag move input (gated further on the player's
  // turn); the finished view passes false so the board is review-only.
  const renderInlineBoardView = (interactive: boolean) =>
    shouldShowInlinePeekHeader(preferences) || shouldShowAlwaysVisibleBoard(preferences) ? (
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
        onPeek={shouldShowAlwaysVisibleBoard(preferences) ? undefined : recordPeek}
        collapseSignal={playerMoveCommitCount}
        alwaysOpen={shouldShowAlwaysVisibleBoard(preferences)}
        // Interactive board moves (click-to-move + drag) only in always-visible
        // mode AND when the player can act right now. The finished view passes
        // interactive=false, so the board is non-interactive there.
        onMove={
          interactive &&
          shouldShowAlwaysVisibleBoard(preferences) &&
          isPlayerTurn &&
          !isLoading &&
          currentPosition === -1
            ? handleBoardMove
            : undefined
        }
        // Count illegal board attempts into the same invalid-attempt counter
        // the text/select/button paths use, so the result page's "Invalid
        // Count" reflects blindfold mistakes regardless of input method.
        onIllegalMove={
          interactive &&
          shouldShowAlwaysVisibleBoard(preferences) &&
          isPlayerTurn &&
          !isLoading &&
          currentPosition === -1
            ? recordInvalid
            : undefined
        }
      />
    ) : undefined;

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
                {/* Board reservation. At most one of these fires — the
                    `shouldShow*` predicates partition the peek-hint space (see
                    preferences.test.ts), and the order mirrors `loading.tsx`.
                    'always' reserves the full-size board card; 'peek+inline'
                    reserves just the ~46px accordion header. Both are driven by
                    the active hint (cookie pre-hydration, preferences post-
                    hydration) so returning users get the correct layout from
                    the very first paint. ('peek+modal' reserves a slot inside
                    the action row below instead; 'never' reserves nothing.) */}
                {skeletonShowAlwaysVisibleBoard && <AlwaysVisibleBoardSkeleton />}
                {skeletonShowInlinePeekHeader && <InlineBoardHeaderSkeleton />}
                <MoveInputSkeleton mode={skeletonMode} hasModeSwitch={skeletonHasModeSwitch} />
                {/* Action row (Show Board + Undo + Resign). Whether the
                    "Show Board" button is reserved is driven by the active
                    hint so users who disabled the button — or use inline
                    peek — don't get a phantom slot reserved during SSR. */}
                <ActionRowSkeleton showBoardButton={skeletonShowModalPeekButton} />
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
                // Peek tracking: counts each "open" action, not view duration.
                // Modal: counted when opened; closing and reopening counts again.
                // Inline: counted when accordion expands; collapsing and re-expanding counts again.
                onShowBoard={() => {
                  recordPeek();
                  setIsBoardVisible(true);
                }}
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
                onShowSettings={
                  canEditPerGameSettings ? () => setShowSettingsModal(true) : undefined
                }
                aiMoveError={
                  aiMoveError.message
                    ? { message: aiMoveError.message, retry: aiMoveError.retry }
                    : null
                }
                inlineBoardView={renderInlineBoardView(true)}
              />
            )}
            {!isInitializing && isFinishedView && isFinished && (
              <FinishedGamePanel
                inlineBoardView={renderInlineBoardView(false)}
                preferences={preferences}
                onViewResult={handleViewResult}
                onPostmortem={handleOpenPostmortem}
                showPostmortem={moves.length > 0}
                onShowBoard={() => setIsBoardVisible(true)}
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
        isBoardVisible={isBoardVisible}
        onCloseBoardVisible={() => setIsBoardVisible(false)}
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
    </div>
  );
}
