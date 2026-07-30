'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import {
  fenToLichessUrl,
  getLastMoveDetails,
  isCheckmateFen,
  replayMoves,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaArrowRight } from 'react-icons/fa';

import type { EngineConfig } from '@/lib/engines';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import { resolveIllegalAttemptSquares } from '@/lib/games/illegal-attempts';
import type {
  GamePlaySettings,
  MoveOperationLog,
  PlaySettingsChangeEntry,
} from '@/lib/games/saved-game-types';
import {
  isFinalPosition,
  resolveLosingColor,
  resolveTerminationMark,
} from '@/lib/games/termination-mark';
import type { DetectedOpening } from '@/lib/openings/detect-game-opening';

import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { MoveOpsDetail } from '@/app/[locale]/(public)/games/play/_components/MoveOpsDetail';
import { MovesPanel } from '@/app/[locale]/(public)/games/play/_components/MovesPanel';
import {
  useBoardFlip,
  useMoveNavigation,
  useNotation,
} from '@/app/[locale]/(public)/games/play/_hooks';
import { useQuickPeekModal } from '@/app/[locale]/(public)/games/play/_hooks/use-quick-peek-modal';
import { buildNewGameFromPositionUrl } from '@/app/[locale]/(public)/games/play/_lib/build-new-game-from-position-url';
import { logForMovesIndex } from '@/app/[locale]/(public)/games/play/_lib/move-ops-alignment';
import { GameStatsOverview } from '@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview';
import { StatsAuthGate } from '@/app/[locale]/(public)/games/play/result/_components/StatsAuthGate';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useTerminationMarkLabel } from '@/app/[locale]/_hooks/use-termination-mark-label';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useReplayDeepLink } from '../_hooks/use-replay-deep-link';
import { useReplayPreferences } from '../_hooks/use-replay-preferences';
import { useReplayUrlSync } from '../_hooks/use-replay-url-sync';
import { useReviewOverview } from '../_hooks/use-review-overview';
import { type ReplaySocial, normalizeReplaySocial } from '../_lib/normalize-replay-social';
import {
  computeContinuation,
  computeCurrentPly,
  computeInitialFlipped,
  computePlayerMoveIndices,
  formatMoveLabel,
  formatSetupMovesLine,
} from '../_lib/replay-derivations';
import { CreateFromPositionMenu } from './CreateFromPositionMenu';
import { GameDiscussionFeed } from './GameDiscussionFeed';
import { GameMoveContributions } from './GameMoveContributions';
import { ReproduceViewBar } from './ReproduceViewBar';
import { ReviewMovePositionPanel } from './ReviewMovePositionPanel';
import { ReviewOverviewTabs } from './ReviewOverviewTabs';

export type { ReplaySocial } from '../_lib/normalize-replay-social';

type Props = {
  moves: string[];
  startingFen: string | null;
  /**
   * Seeded setup-prefix length ({@link Game.setupPlies}): leading moves that
   * were pre-played at setup (opening line / pasted PGN), so they have no
   * operation-log entry. Aligns the ops icons and the By Move strip, and
   * drives the Summary's starting-position board. Null/absent = no prefix.
   */
  setupPlies?: number | null;
  playerColor: 'white' | 'black';
  /**
   * How the game ended, from `playerColor`'s point of view. Drives the
   * end-of-game badge on the losing king (see `resolveTerminationMark`); the
   * first-person / neutral wording of the result itself is the caller's job
   * (`statsHeader`).
   */
  result: 'win' | 'loss' | 'draw';
  /** Opening detected from the moves (server-side); shown above the stats block. */
  detectedOpening: DetectedOpening | null;
  engineConfig: EngineConfig;
  operationLogs: MoveOperationLog[] | null;
  /** Start-of-game blindfold settings snapshot; null for legacy/plain games. */
  playSettings: GamePlaySettings | null;
  /** Mid-game settings edits, folded over `playSettings` per displayed position. */
  playSettingsLog: PlaySettingsChangeEntry[] | null;
  locale: Locale;
  /** Side at the bottom of the board, from the `?color=white|black` URL param. */
  orientation?: 'white' | 'black';
  /** Rendered between the board/move-list and the stats overview (e.g. the description). */
  children?: ReactNode;
  /**
   * Content rendered at the very top of the stats / summary block — used by the
   * result screen for its win/loss/draw label. Omitted on the shared game, whose
   * result is not surfaced with first-person wording.
   */
  statsHeader?: ReactNode;
  /** Social layer — live (published) or local (unshared result screen). */
  social: ReplaySocial;
};

/**
 * Review of a finished game, laid out exactly like games/play: the always-visible
 * board (`InlineBoardView`) in a 2/3 column and the move list (`MovesPanel`) in a
 * 1/3 column, driven by the same notation / navigation hooks. Serves BOTH the
 * published shared game (`games/shared/[id]`) and the just-finished local game on
 * the result screen (`games/play/result`) — the difference is entirely in the
 * injected `social` prop (see {@link ReplaySocial}).
 *
 * Read-only adaptation: `gameInProgress` is false (no "restart from here"), and
 * "new game from here" starts a fresh game from that position so a viewer can
 * try it themselves. Preferences are the viewer's own but forced fully revealed
 * — this is a finished game, not a live blindfold one (see
 * `useReplayPreferences`). The review's cross-cutting concerns (preferences,
 * URL sync, comment/chunk tabs, deep-link, overview tabs) live in `../_hooks`;
 * the position/ply/label math lives in `../_lib/replay-derivations`; this
 * component wires them to the shared notation/navigation hooks and lays out
 * the result.
 *
 * In `local` mode (result screen) there is no persisted game to anchor
 * comments/chunks/likes to, so the social collections are empty and the
 * discussion / per-move contribution regions are replaced by the injected
 * `discussionContent`.
 */
export function GameReview({
  moves,
  startingFen,
  setupPlies,
  playerColor,
  result,
  detectedOpening,
  engineConfig,
  operationLogs,
  playSettings,
  playSettingsLog,
  locale,
  orientation,
  children,
  statsHeader,
  social,
}: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();
  const { preferences } = useGamePreferences();

  const {
    gameId,
    comments,
    gameChunks,
    availableChunks,
    currentUser,
    isGameOwner,
    highlightCommentId,
    viewerIsAuthenticated,
  } = normalizeReplaySocial(social);

  const { moves: notationMoves, formattedPgn } = useNotation({
    // The DB stores moves as string[]; they are SAN (AlgebraicNotation) at runtime.
    initialMoves: moves as AlgebraicNotation[],
    startingFen: startingFen ?? undefined,
  });
  const {
    currentPosition,
    displayFen,
    latestFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
  } = useMoveNavigation({ moves: notationMoves, startingFen: startingFen ?? undefined });

  // Seed the board orientation from the `?color=white|black` param.
  const initialFlipped = useMemo(
    () => computeInitialFlipped(orientation, playerColor),
    [orientation, playerColor]
  );
  const { effectiveFlipped, toggleFlip } = useBoardFlip({
    playerSide: playerColor,
    initialFlipped,
  });

  const {
    reproduceView,
    setReproduceView,
    showPlaySettings,
    effectivePlaySettings,
    boardPreferences,
    hiddenPieceStyle,
    preferencesAt,
  } = useReplayPreferences({
    preferences,
    playSettings,
    playSettingsLog,
    currentPosition,
    notationMovesLength: notationMoves.length,
  });

  useReplayUrlSync({
    currentPosition,
    notationMovesLength: notationMoves.length,
    effectiveFlipped,
  });

  // Highlight the move that produced a given navigation position. Shared by the
  // live board and the quick-peek modal (each with its own position).
  const lastMoveAt = useCallback(
    (position: number) => {
      if (position === -2) return null;
      const upto = position === -1 ? notationMoves : notationMoves.slice(0, position + 1);
      if (upto.length === 0) return null;
      return getLastMoveDetails(upto as string[], startingFen ?? undefined);
    },
    [notationMoves, startingFen]
  );
  const lastMove = useMemo(() => lastMoveAt(currentPosition), [lastMoveAt, currentPosition]);

  // "By Move" quick-peek modal: its own navigation (so previewing never moves the
  // live replay) plus open/close + commit-to-live. See useQuickPeekModal.
  const quickPeek = useQuickPeekModal({
    notationMoves,
    startingFen: startingFen ?? undefined,
    lastMoveAt,
    navigateToPosition,
  });

  // The modal previews its own position independent of the live board (see
  // useQuickPeekModal), so its "as played" obfuscation must be recomputed for
  // THAT position — reusing the live board's boardPreferences/hiddenPieceStyle
  // here would freeze the modal at whatever the live board happened to show
  // when it was opened, ignoring mid-game reveal/hide changes as the viewer
  // scrubs inside the modal.
  const quickPeekPreferences = useMemo(
    () => preferencesAt(quickPeek.nav.currentPosition),
    [preferencesAt, quickPeek.nav.currentPosition]
  );

  const lichessAnalysisUrl = fenToLichessUrl(
    currentPosition === -1 || displayFen === null ? latestFen : displayFen
  );

  // End-of-game badge on the losing king, shown only while a board is on the
  // final position — stepping back through the replay puts the viewer inside a
  // game that had not ended yet. The kind is read off the position itself
  // (`isCheckmateFen`), which is the only place a resignation is distinguishable
  // from a mate: the record stores just win/loss/draw. See
  // `resolveTerminationMark`.
  //
  // Resolved per navigation position rather than once, because the quick-peek
  // modal scrubs independently of the live board (see `useQuickPeekModal`): a
  // single value would leave the modal's final position unmarked whenever the
  // board behind it sits mid-history, which is the usual case when the strip
  // opens it.
  const terminationMarkAt = useCallback(
    (position: number) =>
      isFinalPosition(position, notationMoves.length)
        ? resolveTerminationMark({
            fen: latestFen,
            losingColor: resolveLosingColor(result, playerColor),
            isCheckmate: isCheckmateFen(latestFen),
          })
        : null,
    [notationMoves.length, latestFen, result, playerColor]
  );
  const terminationMark = useMemo(
    () => terminationMarkAt(currentPosition),
    [terminationMarkAt, currentPosition]
  );
  const quickPeekTerminationMark = useMemo(
    () => terminationMarkAt(quickPeek.nav.currentPosition),
    [terminationMarkAt, quickPeek.nav.currentPosition]
  );
  const terminationMarkLabel = useTerminationMarkLabel();

  // Same game-statistics overview as the result screen, derived from the
  // per-move operation logs. The effort strip jumps the inline board.
  const stats = useMemo(() => computeGameStats(operationLogs ?? []), [operationLogs]);
  // Clamp against the move list: a stale record could carry a prefix longer
  // than the moves it describes (e.g. saved before an undo landed).
  const effectiveSetupPlies = Math.min(setupPlies ?? 0, notationMoves.length);
  const playerMoveIndices = useMemo(
    () =>
      computePlayerMoveIndices(
        notationMoves.length,
        startingFen ?? undefined,
        playerColor,
        effectiveSetupPlies
      ),
    [notationMoves.length, startingFen, playerColor, effectiveSetupPlies]
  );

  // The position the game actually started from — a custom FEN, a seeded
  // opening/PGN prefix, or both. Null for a plain standard start (the common
  // case), which keeps the Summary free of a redundant initial board.
  const startPosition = useMemo(() => {
    if (!startingFen && effectiveSetupPlies === 0) return null;
    const positions = replayMoves(
      notationMoves.slice(0, effectiveSetupPlies) as string[],
      startingFen ?? undefined
    );
    return {
      fen: positions[positions.length - 1].fen,
      movesLine: formatSetupMovesLine(notationMoves, effectiveSetupPlies, startingFen),
      // Where the board above should jump on click: the last seeded move, or
      // the initial board (-2) for a FEN-only start.
      jumpIndex: effectiveSetupPlies > 0 ? effectiveSetupPlies - 1 : -2,
    };
  }, [notationMoves, effectiveSetupPlies, startingFen]);

  // Position→ply/label/continuation math (see replay-derivations).
  const currentPly = computeCurrentPly(currentPosition, notationMoves.length);
  const { continuationSan } = computeContinuation(currentPosition, notationMoves);
  const moveLabel = useMemo(
    () => formatMoveLabel(currentPly, notationMoves, startingFen),
    [currentPly, notationMoves, startingFen]
  );
  // This move's aid-usage log, for the per-move position panel's stats block
  // — null for a non-player (AI) move or when the log has no entry for it.
  const currentMoveOperationLog = useMemo(
    () => logForMovesIndex(currentPly ?? undefined, playerMoveIndices, operationLogs ?? []),
    [currentPly, playerMoveIndices, operationLogs]
  );

  // Which rejected attempt of the current move is being pointed at on the
  // board, if any. Reset whenever the displayed move changes — the indices
  // are per-move, so keeping a selection across a navigation would mark an
  // unrelated square.
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number | null>(null);
  useEffect(() => {
    setSelectedAttemptIndex(null);
  }, [currentPly]);

  const attemptSquaresAt = useCallback(
    (attemptIndex: number) =>
      currentMoveOperationLog
        ? resolveIllegalAttemptSquares(currentMoveOperationLog, attemptIndex, playerColor)
        : null,
    [currentMoveOperationLog, playerColor]
  );
  // Toggle: tapping the chip already on the board clears it.
  const handleAttemptSelect = useCallback(
    (attemptIndex: number) =>
      setSelectedAttemptIndex((current) => (current === attemptIndex ? null : attemptIndex)),
    []
  );
  const isAttemptSelectable = useCallback(
    (attemptIndex: number) => attemptSquaresAt(attemptIndex) !== null,
    [attemptSquaresAt]
  );
  const illegalAttempt =
    selectedAttemptIndex != null ? attemptSquaresAt(selectedAttemptIndex) : null;

  // The opening (pre-move) board is the game's overview: show the description
  // and statistics there. Once a move is on the board, that move's comment
  // thread takes their place, directly under the move list.
  const isInitialPosition = currentPosition === -2;

  useReplayDeepLink({
    notationMovesLength: notationMoves.length,
    navigateToPosition,
    highlightCommentId,
    comments,
    currentPosition,
    // The result screen opens showing where play actually started (the setup
    // position of a seeded/custom-FEN game). The shared page keeps the
    // overview board: any move position there swaps the overview for that
    // move's comment thread, which must not happen on plain load.
    fallbackPosition:
      social.mode === 'local' && startPosition ? startPosition.jumpIndex : undefined,
  });

  // `#game-overview` deep-link from the home feed's comment-count icon.
  // Native hash-anchor scrolling can't reach this block: `useMoveNavigation`
  // defaults `currentPosition` to -1 (latest move) on first paint, so
  // `isInitialPosition` — and the `id="game-overview"` div below — doesn't
  // exist until the `useReplayDeepLink` effect above navigates to -2, by
  // which point the browser's one-shot scroll-to-hash has already fired and
  // found nothing. Scroll manually once the block actually mounts.
  const scrolledToOverviewRef = useRef(false);
  useEffect(() => {
    if (scrolledToOverviewRef.current || !isInitialPosition) return;
    if (window.location.hash !== '#game-overview') return;
    const el = document.getElementById('game-overview');
    if (!el) return;
    scrolledToOverviewRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isInitialPosition]);

  // The opening-board stats overview (engine + By Move + change log). Anonymous
  // viewers get it gated behind a members-only sign-up CTA, matching the result
  // page; signed-in viewers see it directly.
  const statsOverview =
    stats.totalMoves > 0 ? (
      <GameStatsOverview
        stats={stats}
        playerMoveIndices={playerMoveIndices}
        operationLogs={operationLogs ?? undefined}
        moves={notationMoves}
        onSelectMove={quickPeek.openAtMove}
        engineConfig={engineConfig}
        playSettings={playSettings ?? undefined}
        playerColor={playerColor}
        startPosition={startPosition}
        opening={detectedOpening}
        locale={locale}
        playSettingsLog={playSettingsLog ?? undefined}
        startingFen={startingFen}
        headingAsSection
        // Result screen's win/loss/draw label, shown directly under the
        // "Game Stats" heading. Omitted (undefined) on the shared game.
        afterTitle={statsHeader}
      />
    ) : null;

  // Stats with the members-only gate applied for anonymous viewers (blurred +
  // sign-up CTA), matching the result page. Shared by the live summary tab and
  // the local (result) layout.
  const gatedStats =
    statsOverview == null ? null : viewerIsAuthenticated ? (
      statsOverview
    ) : (
      <StatsAuthGate title={t('statsGate.title')} description={t('statsGate.description')}>
        {statsOverview}
      </StatsAuthGate>
    );

  const overview = useReviewOverview({
    comments,
    gameChunks,
    hasSummary: statsOverview !== null,
  });

  // Local mode only: point the overview tab at whatever the board now shows.
  // On the shared game the board position alone decides what sits below it —
  // the opening board shows the overview (stats), any move position shows that
  // move's comment thread. Local mode has no per-move thread and its overview
  // does not move with the board, so the tab is what has to follow it, in BOTH
  // directions: stepping onto a move reveals the Discussion, and stepping back
  // to the opening board restores the Summary (the Game Stats the shared game
  // shows at that position).
  const { setOverviewView } = overview;
  const syncOverviewToPosition = useCallback(
    (position: number) => setOverviewView(position === -2 ? 'summary' : 'discussion'),
    [setOverviewView]
  );

  // Commit a previewed position from the quick-peek modal onto the live board.
  const { commit: commitQuickPeek } = quickPeek;
  const quickPeekPosition = quickPeek.nav.currentPosition;
  const handleCommitPosition = useCallback(() => {
    commitQuickPeek();
    if (social.mode === 'local') syncOverviewToPosition(quickPeekPosition);
  }, [commitQuickPeek, social.mode, syncOverviewToPosition, quickPeekPosition]);

  // Local mode: user navigation (the arrows under the board, move-list
  // clicks) moves the tab with the board — same rationale as
  // handleCommitPosition above. The ref gates the switch to real
  // interactions: the programmatic initial landing (deep link / setup
  // position) must leave the Summary visible.
  const pendingUserNavRef = useRef(false);
  const withDiscussionReveal = useCallback(
    <A extends unknown[]>(navigate: (...args: A) => void) =>
      (...args: A) => {
        pendingUserNavRef.current = true;
        navigate(...args);
      },
    []
  );
  useEffect(() => {
    if (!pendingUserNavRef.current) return;
    pendingUserNavRef.current = false;
    if (social.mode === 'local') syncOverviewToPosition(currentPosition);
  }, [currentPosition, social.mode, syncOverviewToPosition]);
  const userNav = useMemo(
    () => ({
      toStart: withDiscussionReveal(navigateToStart),
      previous: withDiscussionReveal(navigatePrevious),
      next: withDiscussionReveal(navigateNext),
      toEnd: withDiscussionReveal(navigateToEnd),
      toPosition: withDiscussionReveal(navigateToPosition),
    }),
    [
      withDiscussionReveal,
      navigateToStart,
      navigatePrevious,
      navigateNext,
      navigateToEnd,
      navigateToPosition,
    ]
  );

  return (
    <div className="space-y-6">
      {/* One grid holds the board, the move list AND the block below them, so
          their order can differ per breakpoint. DOM order is the phone's —
          board, then the per-move/overview block, then the move list — because
          on a single column the comment thread belongs directly under the board
          it discusses; a move list wedged between them separates a position
          from its own commentary. From `lg` the `order-*` classes restore the
          desktop reading: board (2/3) beside the move list (1/3), with the
          block spanning the full width below both. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:order-1 lg:col-span-2" ref={quickPeek.boardColumnRef}>
          <InlineBoardView
            board={{
              fen: displayFen ?? latestFen,
              playerSide: playerColor,
              flipped: effectiveFlipped,
              lastMove,
              preferences: boardPreferences,
              hiddenPieceStyle,
              illegalAttempt,
              terminationMark,
              terminationMarkLabel: terminationMarkLabel(terminationMark),
            }}
            moveList={{
              movesLength: notationMoves.length,
              currentPosition,
              formattedPgn,
            }}
            navigation={{
              onNavigateToStart: userNav.toStart,
              onNavigatePrevious: userNav.previous,
              onNavigateNext: userNav.next,
              onNavigateToEnd: userNav.toEnd,
              onNavigateToPosition: userNav.toPosition,
              onFlipBoard: toggleFlip,
            }}
            // A finished game is reviewed, not played: no mask, no peek.
            visibility={{ kind: 'always' }}
            slots={{
              // Author a chunk / position-memory / puzzle seeded from the
              // position on the board. It rides in the control strip because
              // "this position" IS the board's, and it steps with it. Signed-in
              // viewers only (`currentUser` is null in `local` mode by
              // construction, so the result screen never gets it); nothing on
              // the opening board, where a standard start seeds nothing worth
              // saving.
              trailingAction:
                currentUser && !isInitialPosition ? (
                  <CreateFromPositionMenu
                    locale={locale}
                    currentFen={displayFen ?? latestFen}
                    continuationSan={continuationSan}
                  />
                ) : undefined,
            }}
          />

          {showPlaySettings && effectivePlaySettings && (
            <ReproduceViewBar
              settings={effectivePlaySettings}
              playerColor={playerColor}
              reproduceView={reproduceView}
              onToggle={() => setReproduceView((v) => !v)}
            />
          )}
        </div>

        <div className="lg:order-3 lg:col-span-3">
          {/* Local (result) mode: same [Summary | Discussion] overview as the shared
          game, for a consistent layout. There is no persisted game to anchor
          social data to, so the Discussion tab holds the share CTA (share to
          unlock discussion) instead of a comment feed, and the tabs stay put as
          the viewer steps through the moves. */}
          {social.mode === 'local' ? (
            <div className="space-y-4">
              {children}

              {/* This move's aid-usage detail — the SAME block the shared game shows
              in its per-move panel — so a rejected (illegal) board move surfaces
              *which* move was tried here too, before the game is published, not
              only its count. Self-hiding on moves with nothing notable, so the
              overview layout below is unchanged in the common case. */}
              {currentPly != null && (
                <MoveOpsDetail
                  title={moveLabel ?? t('comments.title')}
                  moveOperationLog={currentMoveOperationLog}
                />
              )}

              <ReviewOverviewTabs
                active={overview.overviewView}
                onChange={overview.setOverviewView}
                summaryLabel={t('overview.summaryTab')}
                discussionLabel={t('overview.discussionTab')}
              />

              {overview.overviewView === 'summary' && gatedStats}
              {overview.overviewView === 'discussion' &&
                social.discussionContent?.({ isInitialPosition })}
            </div>
          ) : /* On a move position: that move's comment thread. On the opening
          board: the description + statistics. */
          isInitialPosition ? (
            // `id` + `scroll-mt-20`: lets a link from elsewhere (e.g. the home
            // feed's comment-count icon, via `#game-overview`) land here instead
            // of the top of the page — this sits below the board/move-list widget.
            // `space-y-6` replaces the gap the parent's own `space-y-6` used to
            // apply between these (previously fragment-spread, now grouped) children.
            <div id="game-overview" className="scroll-mt-20 space-y-6">
              {children}

              {overview.showOverviewTabs && (
                <ReviewOverviewTabs
                  active={overview.activeOverviewView}
                  onChange={overview.setOverviewView}
                  summaryLabel={t('overview.summaryTab')}
                  discussionLabel={
                    overview.discussionCount > 0
                      ? `${t('overview.discussionTab')} (${overview.discussionCount})`
                      : t('overview.discussionTab')
                  }
                />
              )}

              {overview.activeOverviewView === 'summary' && gatedStats}

              {overview.activeOverviewView === 'discussion' && (
                <div className="space-y-8">
                  {/* The whole-game thread, fully interactive (composer, likes,
                      replies) — unlike the per-move index below, `ply = NULL`
                      comments have no per-move view to act in, so THIS is their
                      thread. The heading names the anchor: a game with a custom
                      FEN / seeded-prefix start has a discussable start position,
                      a plain game just "the whole game" — one NULL anchor serves
                      both readings (see the gameComments.ply schema TSDoc). */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      {startPosition ? t('discussion.startPosition') : t('discussion.wholeGame')}
                    </h3>
                    <GameMoveContributions
                      gameId={gameId}
                      currentPly={null}
                      comments={comments}
                      gameChunks={gameChunks}
                      availableChunks={availableChunks}
                      currentUser={currentUser}
                      isGameOwner={isGameOwner}
                      locale={locale}
                      moves={notationMoves}
                      startingFen={startingFen}
                      playerColor={playerColor}
                    />
                  </section>

                  {/* Per-move contributions, as a read-only index that jumps
                      into each move's own thread. Self-hiding when no move has
                      any. */}
                  <GameDiscussionFeed
                    comments={comments}
                    gameChunks={gameChunks}
                    notationMoves={notationMoves}
                    startingFen={startingFen}
                    playerColor={playerColor}
                    onJumpToPly={navigateToPosition}
                    locale={locale}
                  />
                </div>
              )}
            </div>
          ) : (
            currentPly != null && (
              <ReviewMovePositionPanel
                title={moveLabel ?? t('comments.title')}
                locale={locale}
                gameId={gameId}
                currentPly={currentPly}
                comments={comments}
                gameChunks={gameChunks}
                availableChunks={availableChunks}
                currentUser={currentUser}
                isGameOwner={isGameOwner}
                moves={notationMoves}
                startingFen={startingFen}
                playerColor={playerColor}
                moveOperationLog={currentMoveOperationLog}
                onAttemptSelect={handleAttemptSelect}
                selectedAttemptIndex={selectedAttemptIndex}
                isAttemptSelectable={isAttemptSelectable}
              />
            )
          )}
        </div>

        <div className="lg:order-2 lg:col-span-1">
          <MovesPanel
            moveList={{
              formattedPgn,
              currentPosition,
              movesLength: notationMoves.length,
              currentFen: latestFen,
              displayFen,
              startingFen: startingFen ?? undefined,
            }}
            navigation={{
              onNavigateToPosition: userNav.toPosition,
              onNavigateToStart: userNav.toStart,
              onNavigatePrevious: userNav.previous,
              onNavigateNext: userNav.next,
              onNavigateToEnd: userNav.toEnd,
            }}
            actions={{
              // Read-only view: the game is finished and not the viewer's, so
              // "restart from here" is hidden; "new game from here" lets a viewer
              // play the position themselves.
              gameInProgress: false,
              lichessAnalysisUrl,
              onRestartFromPosition: () => {},
              onNewGameFromPosition: (position) =>
                router.push(
                  buildNewGameFromPositionUrl({
                    locale,
                    moves: notationMoves,
                    position,
                    playerSide: playerColor,
                    engineConfig,
                    startingFen: startingFen ?? undefined,
                  })
                ),
            }}
            operations={{
              logs: operationLogs ?? [],
              playerSide: playerColor,
              setupPlies: effectiveSetupPlies,
            }}
            showBackground={false}
          />
        </div>
      </div>

      {/* By Move quick-peek modal (mirrors the result page). Runs its own
          navigation so previewing never moves the live replay; the footer CTA
          commits the position to the page, where per-move comments live. */}
      <BoardViewModal
        isOpen={quickPeek.isOpen}
        onClose={quickPeek.close}
        fen={quickPeek.nav.displayFen ?? latestFen}
        playerSide={playerColor}
        flipped={effectiveFlipped}
        lastMove={quickPeek.lastMove}
        preferences={quickPeekPreferences.boardPreferences}
        hiddenPieceStyle={quickPeekPreferences.hiddenPieceStyle}
        movesLength={notationMoves.length}
        currentPosition={quickPeek.nav.currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={quickPeek.nav.navigateToStart}
        onNavigatePrevious={quickPeek.nav.navigatePrevious}
        onNavigateNext={quickPeek.nav.navigateNext}
        onNavigateToEnd={quickPeek.nav.navigateToEnd}
        onNavigateToPosition={quickPeek.nav.navigateToPosition}
        onFlipBoard={toggleFlip}
        terminationMark={quickPeekTerminationMark}
        terminationMarkLabel={terminationMarkLabel(quickPeekTerminationMark)}
        footer={
          <button
            type="button"
            onClick={handleCommitPosition}
            className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t('openPosition')}
            <FaArrowRight className="h-3 w-3" aria-hidden />
          </button>
        }
      />
    </div>
  );
}
