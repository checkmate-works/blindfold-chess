'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import {
  fenToLichessUrl,
  getLastMoveDetails,
  replayMoves,
} from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaArrowRight } from 'react-icons/fa';

import type { EngineConfig } from '@/lib/engines';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import type {
  GamePlaySettings,
  MoveOperationLog,
  PlaySettingsChangeEntry,
} from '@/lib/games/saved-game-types';
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
import { GameDiscussionFeed } from './GameDiscussionFeed';
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

  // The opening (pre-move) board is the game's overview: show the description
  // and statistics there. Once a move is on the board, that move's comment
  // thread takes their place, directly under the move list.
  const isInitialPosition = currentPosition === -2;

  useReplayDeepLink({
    notationMovesLength: notationMoves.length,
    navigateToPosition,
    highlightCommentId,
    comments,
    isInitialPosition,
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

  // Commit a previewed position from the quick-peek modal onto the live board.
  // In `live` mode moving to a move position already surfaces that move's
  // comment thread below the board; `local` mode has no per-move thread and a
  // position-independent overview, so it additionally switches to the Discussion
  // tab — matching the shared game, where opening a position reveals discussion.
  const { commit: commitQuickPeek } = quickPeek;
  const { setOverviewView } = overview;
  const handleCommitPosition = useCallback(() => {
    commitQuickPeek();
    if (social.mode === 'local') setOverviewView('discussion');
  }, [commitQuickPeek, social.mode, setOverviewView]);

  // Local mode: user navigation (the arrows under the board, move-list
  // clicks) onto a move position also routes the viewer to the Discussion
  // tab — same rationale as handleCommitPosition above. The ref gates the
  // switch to real interactions: the programmatic initial landing (deep link
  // / setup position) must leave the Summary visible.
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
    if (social.mode === 'local' && currentPosition !== -2) setOverviewView('discussion');
  }, [currentPosition, social.mode, setOverviewView]);
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2" ref={quickPeek.boardColumnRef}>
          <InlineBoardView
            fen={displayFen ?? latestFen}
            playerSide={playerColor}
            flipped={effectiveFlipped}
            lastMove={lastMove}
            preferences={boardPreferences}
            movesLength={notationMoves.length}
            currentPosition={currentPosition}
            formattedPgn={formattedPgn}
            onNavigateToStart={userNav.toStart}
            onNavigatePrevious={userNav.previous}
            onNavigateNext={userNav.next}
            onNavigateToEnd={userNav.toEnd}
            onNavigateToPosition={userNav.toPosition}
            onFlipBoard={toggleFlip}
            hiddenPieceStyle={hiddenPieceStyle}
            alwaysOpen
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

        <div className="lg:col-span-1">
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
          {overview.overviewView === 'discussion' && social.discussionContent}
        </div>
      ) : /* On a move position: that move's comment thread, directly under the
          move list. On the opening board: the description + statistics. */
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
              discussionLabel={`${t('overview.discussionTab')} (${overview.discussionCount})`}
            />
          )}

          {overview.activeOverviewView === 'summary' && gatedStats}

          {overview.activeOverviewView === 'discussion' && overview.hasDiscussion && (
            <GameDiscussionFeed
              comments={comments}
              gameChunks={gameChunks}
              notationMoves={notationMoves}
              startingFen={startingFen}
              playerColor={playerColor}
              onJumpToPly={navigateToPosition}
              locale={locale}
            />
          )}
        </div>
      ) : (
        currentPly != null && (
          <ReviewMovePositionPanel
            title={moveLabel ?? t('comments.title')}
            locale={locale}
            currentFen={displayFen ?? latestFen}
            continuationSan={continuationSan}
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
          />
        )
      )}

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
