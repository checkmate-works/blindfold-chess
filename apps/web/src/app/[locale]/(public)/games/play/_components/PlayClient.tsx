'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { notFound, useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useBoardFlip, useConfirmationDialogs, useMoveNavigation } from '../_hooks';
import type { GameSession } from '../_hooks/use-game-session';
import {
  deriveMoveInputSkeletonProps,
  shouldShowAlwaysVisibleBoard,
  shouldShowInlinePeekHeader,
  shouldShowModalPeekButton,
} from '../_lib';
import { BoardViewModal } from './BoardViewModal';
import { EngineInfoModal } from './EngineInfoModal';
import { GameInProgressPanel } from './GameInProgressPanel';
import { InlineBoardView } from './InlineBoardView';
import { MidGameSettingsModal } from './MidGameSettingsModal';
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
  const t = useTranslations('play');
  const router = useRouter();

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

  // Global preferences
  const { preferences: globalPreferences, updatePreferences, isHydrated } = useGamePreferences();

  // Pre-hydration skeleton shape: prefer the cookie-sourced hints from the
  // server over `globalPreferences` (which is still the provider's defaults
  // until localStorage is read). Once `isHydrated` flips true,
  // `globalPreferences` becomes the source of truth — matching the
  // localStorage value, which may or may not agree with the cookie.
  //
  // Reconciliation rule: cookie wins on first paint (driven by these
  // branches); localStorage wins post-hydration (driven by
  // `globalPreferences`). The `GamePreferencesContext` also mirrors
  // subsequent preference changes back to the cookie so the two stay in
  // sync on the next navigation.
  // Pre-hydration derivation is shared with `loading.tsx` via
  // `deriveMoveInputSkeletonProps` so the two entry points stay in lockstep.
  const hintSkeletonProps = deriveMoveInputSkeletonProps(initialMoveInputHint);
  const skeletonMode = isHydrated ? globalPreferences.moveInputMode : hintSkeletonProps.mode;
  const skeletonHasModeSwitch = isHydrated
    ? globalPreferences.enabledMoveInputModes.length >= 2
    : hintSkeletonProps.hasModeSwitch;

  // Merge per-game preferences with global preferences
  // Per-game fields override global; other fields come from global
  const preferences: GamePreferences = useMemo(() => {
    if (!perGamePrefs) return globalPreferences;
    return {
      ...globalPreferences,
      boardVisibility: perGamePrefs.boardVisibility ?? globalPreferences.boardVisibility,
      highlightLastMove: perGamePrefs.highlightLastMove,
      showOwnPieces: perGamePrefs.showOwnPieces,
      showOpponentPieces: perGamePrefs.showOpponentPieces,
      pieceShapeMode: perGamePrefs.pieceShapeMode,
      pieceColors: perGamePrefs.pieceColors,
      // peekMode was added to PerGamePreferences after the field set settled,
      // so legacy `gamePreferences` records on disk may not carry it.
      // Falling back to the global value keeps those records rendering as
      // they always did, and a subsequent mid-game edit + save will backfill
      // the per-game record forward-compat.
      peekMode: perGamePrefs.peekMode ?? globalPreferences.peekMode,
      // moveInputMode was promoted to per-game later still — same fallback
      // pattern. Legacy records simply track the global until the user
      // toggles in this game, at which point per-game takes over.
      moveInputMode: perGamePrefs.moveInputMode ?? globalPreferences.moveInputMode,
    };
  }, [globalPreferences, perGamePrefs]);

  // Pre-hydration peek skeleton decisions: cookie hint wins on first paint,
  // `preferences` (merged with per-game overrides) wins post-hydration. This
  // mirrors the `skeletonMode` / `skeletonHasModeSwitch` pattern above.
  const skeletonShowInlinePeekHeader = isHydrated
    ? shouldShowInlinePeekHeader(preferences)
    : shouldShowInlinePeekHeader(initialPeekHint);
  const skeletonShowModalPeekButton = isHydrated
    ? shouldShowModalPeekButton(preferences)
    : shouldShowModalPeekButton(initialPeekHint);

  // UI state
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [showOperationLogModal, setShowOperationLogModal] = useState(false);
  const [showEngineInfoModal, setShowEngineInfoModal] = useState(false);
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
                {/* InlineBoardView header (~46px). Reserved whenever the
                    active hint (cookie pre-hydration, preferences post-
                    hydration) says the user has `peekMode='inline'` with
                    `boardVisibility='peek'`, so returning inline
                    users get the correct layout from the very first paint. */}
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
                onShowEngineInfo={() => setShowEngineInfoModal(true)}
                onShowSettings={
                  canEditPerGameSettings ? () => setShowSettingsModal(true) : undefined
                }
                aiMoveError={
                  aiMoveError.message
                    ? { message: aiMoveError.message, retry: aiMoveError.retry }
                    : null
                }
                inlineBoardView={
                  // Render the InlineBoardView for either the peek-inline
                  // mode (collapsible header + auto-collapse on commit) or
                  // the always-visible mode (no chrome, board permanently
                  // open). `alwaysOpen` switches the component between the
                  // two; peekCount is intentionally not recorded in always
                  // mode (`onPeek` is also a no-op there).
                  shouldShowInlinePeekHeader(preferences) ||
                  shouldShowAlwaysVisibleBoard(preferences) ? (
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
                      onPeek={shouldShowAlwaysVisibleBoard(preferences) ? undefined : recordPeek}
                      collapseSignal={playerMoveCommitCount}
                      alwaysOpen={shouldShowAlwaysVisibleBoard(preferences)}
                      // Interactive board moves (click-to-move + DnD) are
                      // only enabled in always-visible mode AND when the
                      // player can act right now. Gating on these three
                      // conditions keeps the cursor / drag affordances
                      // honest: no draggable handle while the AI is
                      // thinking, no moves accepted while browsing history.
                      onMove={
                        shouldShowAlwaysVisibleBoard(preferences) &&
                        isPlayerTurn &&
                        !isLoading &&
                        currentPosition === -1
                          ? handleBoardMove
                          : undefined
                      }
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
              operations={{ logs: operationLogs, playerSide }}
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
        gamePreferences={initialPerGamePrefs}
        preferenceChangeLog={preferenceChangeLog}
      />

      {/* Engine Info Modal */}
      <EngineInfoModal
        isOpen={showEngineInfoModal}
        onClose={() => setShowEngineInfoModal(false)}
        engineConfig={engineConfig}
      />

      {/* Mid-game Settings Modal. Always rendered when an initial snapshot
          exists; its open/close state is driven by `showSettingsModal`. The
          modal mutates the per-game change log directly via `setPerGamePref`
          — every change is one log entry, which keeps the audit honest
          (matching the inline-peek auto-collapse + operation-log pattern). */}
      {canEditPerGameSettings && (
        <MidGameSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          preferences={preferences}
          onPerGamePrefChange={setPerGamePref}
        />
      )}
    </div>
  );
}
