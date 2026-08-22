'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl, replayMoves } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, FinalGameOutcome, Side } from '@blindfold-chess/types';
import { FaArrowRight } from 'react-icons/fa';

import type { AiReview, AiReviewGenerationOffer } from '@/lib/ai-review/types';
import type { EngineConfig } from '@/lib/engines';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import type { EvaluationMark } from '@/lib/games/evaluation';
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
import { useTerminationMarkLabel } from '@/app/[locale]/_hooks/use-termination-mark-label';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useHashScrollOnce } from '../_hooks/use-hash-scroll-once';
import { useIllegalAttemptSelection } from '../_hooks/use-illegal-attempt-selection';
import { useOverviewPositionSync } from '../_hooks/use-overview-position-sync';
import { useReplayDeepLink } from '../_hooks/use-replay-deep-link';
import { useReplayPreferences } from '../_hooks/use-replay-preferences';
import { useReplayUrlSync } from '../_hooks/use-replay-url-sync';
import { useReviewOverview } from '../_hooks/use-review-overview';
import { useReviewPositionMarks } from '../_hooks/use-review-position-marks';
import { type ReplaySocial, normalizeReplaySocial } from '../_lib/normalize-replay-social';
import { parseOverviewTabParam } from '../_lib/overview-tab-param';
import {
  computeContinuation,
  computeCurrentPly,
  computeInitialFlipped,
  computePlayerMoveIndices,
  formatMoveLabel,
  formatSetupMovesLine,
} from '../_lib/replay-derivations';
import { AiReviewPanel } from './AiReviewPanel';
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
  playerColor: Side;
  /**
   * How the game ended, from `playerColor`'s point of view. Drives the
   * end-of-game badge on the losing king (see `resolveTerminationMark`); the
   * first-person / neutral wording of the result itself is the caller's job
   * (`statsHeader`).
   */
  result: FinalGameOutcome;
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
  orientation?: Side;
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
  /**
   * AI Review tab wiring — live (shared) page only; omitted on the local
   * result screen, whose game has no server-side identity to cache a review
   * under. Present only when the viewer has a review to read or an offer to
   * act on, so the tab never renders as an empty explanation — the caller owns
   * that policy (see `SharedGameDetailView`).
   */
  aiReview?: { initial: AiReview | null; generation: AiReviewGenerationOffer | null };
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
  aiReview,
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

  // The game's AI review, as the whole page's copy of it: the board marks
  // graded moves and the per-move panel repeats the review's take on the move
  // it is discussing, so this cannot live inside the tab that renders it.
  // Seeded from the server-resolved review so both are right before the tab is
  // ever opened, and raised by the panel when a fresh review finishes there
  // (the panel owns that generation, and is unmounted while another tab shows).
  //
  // It is also what the panel reads back on re-mount. The tab is conditionally
  // rendered, so leaving another tab destroys the panel's own state; this state
  // outlives it and is the only place a review generated this session survives
  // until the next server render.
  //
  // Not lifted for the local (result-screen) layout, which has no AI review at
  // all — `aiReview` is undefined there and the seed is null.
  const [review, setReview] = useState<AiReview | null>(aiReview?.initial ?? null);
  // Stable identity: `?? []` fresh on every render would defeat the memos below.
  const reviewMoments = useMemo(() => review?.moments ?? [], [review]);
  const judgmentByPly = useMemo(
    () => new Map(reviewMoments.map((m) => [m.ply, m.judgment])),
    [reviewMoments]
  );
  const bestMoveSanByPly = useMemo(
    () =>
      new Map(
        reviewMoments.flatMap((m) => (m.bestMoveSan ? [[m.ply, m.bestMoveSan] as const] : []))
      ),
    [reviewMoments]
  );
  // The moment (engine facts) and its comment (LLM prose) for a given ply,
  // joined the same way the AI Review tab joins them — by ply, never by index.
  const reviewMomentByPly = useMemo(() => {
    if (!review) return new Map<number, never>();
    const comments = new Map(review.content.momentComments.map((c) => [c.ply, c]));
    // The review's own timestamp stands in for a posting time — a moment is a
    // projection of the review, not a row with a life of its own.
    const createdAt = new Date(review.createdAt);
    return new Map(
      reviewMoments.map((moment) => [
        moment.ply,
        { moment, comment: comments.get(moment.ply), createdAt },
      ])
    );
  }, [review, reviewMoments]);

  // The last-move highlight, the end-of-game badge and the move grade, all
  // resolved per navigation position because the live board and the quick-peek
  // modal scrub independently. See the hook for why none can be a single value.
  const { lastMoveAt, terminationMarkAt, evaluationMarkAt, bestMoveArrowAt } =
    useReviewPositionMarks({
      notationMoves,
      startingFen: startingFen ?? undefined,
      playerColor,
      result,
      latestFen,
      judgmentByPly,
      bestMoveSanByPly,
    });
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

  const terminationMark = useMemo(
    () => terminationMarkAt(currentPosition),
    [terminationMarkAt, currentPosition]
  );
  const quickPeekTerminationMark = useMemo(
    () => terminationMarkAt(quickPeek.nav.currentPosition),
    [terminationMarkAt, quickPeek.nav.currentPosition]
  );
  const terminationMarkLabel = useTerminationMarkLabel();

  const evaluationMark = useMemo(
    () => evaluationMarkAt(currentPosition),
    [evaluationMarkAt, currentPosition]
  );
  const quickPeekEvaluationMark = useMemo(
    () => evaluationMarkAt(quickPeek.nav.currentPosition),
    [evaluationMarkAt, quickPeek.nav.currentPosition]
  );
  /** The grade's localized name, for the badge's accessible name / tooltip. */
  const judgmentLabel = (mark: EvaluationMark | null) =>
    mark ? t(`aiReview.judgments.${mark.judgment}`) : undefined;

  const bestMoveArrow = useMemo(
    () => bestMoveArrowAt(currentPosition),
    [bestMoveArrowAt, currentPosition]
  );
  const quickPeekBestMoveArrow = useMemo(
    () => bestMoveArrowAt(quickPeek.nav.currentPosition),
    [bestMoveArrowAt, quickPeek.nav.currentPosition]
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

  // Which rejected attempt of the displayed move is pointed at on the board —
  // shared between the panel's chips and the board's marking.
  const { selectedAttemptIndex, illegalAttempt, handleAttemptSelect, isAttemptSelectable } =
    useIllegalAttemptSelection({
      moveOperationLog: currentMoveOperationLog,
      playerColor,
      currentPly,
    });

  // The opening (pre-move) board is the game's overview: show the description
  // and statistics there. Once a move is on the board, that move's comment
  // thread takes their place, directly under the move list.
  const isInitialPosition = currentPosition === -2;

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

  // The overview tab follows the board: stepping onto a move selects the
  // Discussion (that move's thread on the shared game), while the Summary and
  // AI Review stay mounted one click away. `userNav` replaces the raw
  // navigation callbacks everywhere the viewer drives them.
  const { userNav, syncToPosition } = useOverviewPositionSync({
    // Stepping back to the opening board restores the result screen's Summary,
    // but leaves the shared game's tab alone — see the option's TSDoc.
    atInitialPosition: social.mode === 'local' ? 'summary' : 'keep',
    currentPosition,
    navigation: {
      navigateToStart,
      navigatePrevious,
      navigateNext,
      navigateToEnd,
      navigateToPosition,
    },
    setOverviewView: overview.setOverviewView,
  });

  useReplayUrlSync({
    currentPosition,
    notationMovesLength: notationMoves.length,
    effectiveFlipped,
    overviewView: overview.activeOverviewView,
  });

  // A `#14` / `?comment=` landing on the shared page is a request to read
  // that move, so the tab opens on its thread — unless the URL names a tab,
  // which is what coming back to this page does (`useReplayUrlSync` wrote the
  // tab the viewer had open into the history entry); then that tab is the
  // request, at that move. A deep-linked comment still wins: it lives in the
  // Discussion, so any `?tab=` beside it would only hide it.
  const { showOverviewTabs, setOverviewView } = overview;
  const offersAiReview = aiReview != null;
  const handleLand = useCallback(
    (
      position: number,
      { tabParam, viaComment }: { tabParam: string | null; viaComment: boolean }
    ) => {
      const requested = viaComment
        ? null
        : parseOverviewTabParam(tabParam, { showOverviewTabs, aiReview: offersAiReview });
      if (requested) setOverviewView(requested);
      else syncToPosition(position);
    },
    [showOverviewTabs, offersAiReview, setOverviewView, syncToPosition]
  );

  useReplayDeepLink({
    notationMovesLength: notationMoves.length,
    navigateToPosition,
    highlightCommentId,
    comments,
    currentPosition,
    // The result screen opens showing where play actually started (the setup
    // position of a seeded/custom-FEN game). The shared page keeps the
    // overview board unless the URL asks for a move.
    fallbackPosition:
      social.mode === 'local' && startPosition ? startPosition.jumpIndex : undefined,
    // The result screen's landing is a fallback, not a request, and must leave
    // the Summary showing — see `handleLand` for the shared page.
    onLand: social.mode === 'live' ? handleLand : undefined,
  });

  // `#game-overview` deep-link from the home feed's comment-count icon. The
  // block only exists once `useReplayDeepLink` above has navigated to the
  // opening board, which is too late for the browser's own scroll-to-hash.
  useHashScrollOnce('game-overview', isInitialPosition);

  // Commit a previewed position from the quick-peek modal onto the live board.
  // The jump doesn't go through `userNav`, so the tab is synced explicitly.
  const { commit: commitQuickPeek } = quickPeek;
  const quickPeekPosition = quickPeek.nav.currentPosition;
  const handleCommitPosition = useCallback(() => {
    commitQuickPeek();
    syncToPosition(quickPeekPosition);
  }, [commitQuickPeek, syncToPosition, quickPeekPosition]);

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
              // The AI review's verdict on the move just played, on the square
              // it landed on — so stepping the board reads like an analysis
              // board, not only the review tab's list.
              evaluationMark,
              evaluationMarkLabel: judgmentLabel(evaluationMark),
              // Read-only: no `onAnnotationsChange`, so the board draws the
              // engine arrow without becoming a drawing surface.
              annotations: bestMoveArrow,
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
                    // A chunk authored here links back to this move on save.
                    // Only in `live` mode (the local result screen has no
                    // persisted game to anchor to) and only on a numbered
                    // ply — `game_chunks.ply` is NOT NULL.
                    linkTarget={
                      social.mode === 'live' && currentPly != null
                        ? { gameId, ply: currentPly }
                        : undefined
                    }
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
          ) : (
            /* The tab set is the same at every board position — only the
            Discussion tab is scoped to the board, holding the whole-game thread
            on the opening board and that move's thread on a move position. The
            Summary and the AI Review describe the game, not a position, so they
            stay reachable while stepping through it (they used to be replaced
            outright by the per-move thread, which stranded them on the opening
            board). Stepping DOES select the Discussion — see
            `useOverviewPositionSync`. */
            // `id` + `scroll-mt-20`: lets a link from elsewhere (e.g. the home
            // feed's comment-count icon, via `#game-overview`) land here instead
            // of the top of the page — this sits below the board/move-list widget.
            <div id="game-overview" className="scroll-mt-20 space-y-6">
              {/* The game's description is header content for the review as a
                  whole; it introduces the game, so it rides with the opening
                  board rather than repeating above every move's thread. */}
              {isInitialPosition && children}

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
                  aiReviewLabel={aiReview ? t('aiReview.tab') : undefined}
                />
              )}

              {overview.activeOverviewView === 'summary' && gatedStats}

              {overview.activeOverviewView === 'aiReview' && aiReview && (
                <AiReviewPanel
                  gameId={gameId}
                  locale={locale}
                  moves={moves}
                  startingFen={startingFen}
                  // The page's copy, NOT `aiReview.initial` — switching tabs
                  // unmounts this panel, and the server prop is still null for
                  // a review generated in this session, so reading it here
                  // would send the author back to the generate button.
                  initialReview={review}
                  generation={aiReview.generation}
                  // Preview in the quick-peek modal (like the By Move strip),
                  // so following a review's citation never scrolls the live
                  // replay out from under the paragraph being read. The modal's
                  // footer commits the position for a viewer who wants to go
                  // there — which then switches this block to that move's thread.
                  onJumpToPly={quickPeek.openAtMove}
                  onReviewGenerated={setReview}
                />
              )}

              {overview.activeOverviewView === 'discussion' &&
                (isInitialPosition ? (
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
                ) : (
                  /* A move is on the board: the Discussion is that move's own
                     thread, with its aid-usage detail above it. */
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
                      aiReviewMoment={reviewMomentByPly.get(currentPly)}
                    />
                  )
                ))}
            </div>
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
        evaluationMark={quickPeekEvaluationMark}
        evaluationMarkLabel={judgmentLabel(quickPeekEvaluationMark)}
        annotations={quickPeekBestMoveArrow}
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
