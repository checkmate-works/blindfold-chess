'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl, getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaArrowRight } from 'react-icons/fa';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';
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
import { MovesPanel } from '@/app/[locale]/(public)/games/play/_components/MovesPanel';
import {
  useBoardFlip,
  useMoveNavigation,
  useNotation,
} from '@/app/[locale]/(public)/games/play/_hooks';
import { buildNewGameFromPositionUrl } from '@/app/[locale]/(public)/games/play/_lib/build-new-game-from-position-url';
import { getMovingSide, parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { computeMoveNumber } from '@/app/[locale]/(public)/games/play/postmortem/_lib/compute-move-number';
import { GameStatsOverview } from '@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview';
import { StatsAuthGate } from '@/app/[locale]/(public)/games/play/result/_components/StatsAuthGate';
import { type HelpStep, HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { tabItemClass, tabsRowClass } from '@/app/[locale]/_components/tab-styles';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useQuickPeekModal } from '../_hooks/use-quick-peek-modal';
import { useReplayDeepLink } from '../_hooks/use-replay-deep-link';
import { useReplayPreferences } from '../_hooks/use-replay-preferences';
import { useReplayUrlSync } from '../_hooks/use-replay-url-sync';
import { buildDiscussionGroups } from '../_lib/build-discussion-groups';
import { CreateFromPositionMenu } from './CreateFromPositionMenu';
import type { CommentUser } from './GameCommentContext';
import { GameDiscussionFeed } from './GameDiscussionFeed';
import { GameMoveContributions } from './GameMoveContributions';
import { PlaySettingsIndicator } from './PlaySettingsIndicator';

/**
 * The social layer of the review, injected as a discriminated union so the same
 * component serves a published game (`live` — real comments/chunks/likes wired
 * to server actions) and a not-yet-shared local game on the result screen
 * (`local` — no social data; a share CTA sits where the discussion would be).
 */
export type ReplaySocial =
  | {
      mode: 'live';
      /** Published game id, used to anchor the per-move comment threads. */
      gameId: string;
      /** Advice comments on this game, anchored per move (ply). */
      comments: GameCommentItem[];
      /** Community chunk links on this game, anchored per move (ply). */
      gameChunks: GameChunkItem[];
      /** Published chunks selectable in the per-move chunk picker. */
      availableChunks: ChunkOption[];
      /** The viewer, if signed in — enables posting and delete-own. */
      currentUser: CommentUser | null;
      /** Whether the viewer is the game's registered owner (may remove any chunk link). */
      isGameOwner: boolean;
      /** When set (from a like notification), open at this comment's move and scroll to it. */
      highlightCommentId?: string;
    }
  | {
      mode: 'local';
      /** Whether the local viewer is signed in — drives the stats auth-gate. */
      isAuthenticated: boolean;
      /**
       * Body of the Discussion tab for a not-yet-shared game — the compose CTAs
       * that route to a sign-in / share prompt (see `LocalDiscussionPanel`).
       */
      discussionContent: ReactNode;
    };

type Props = {
  moves: string[];
  startingFen: string | null;
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

/** Stable empty collections for `local` mode, so hook deps never churn. */
const NO_COMMENTS: GameCommentItem[] = [];
const NO_CHUNKS: GameChunkItem[] = [];
const NO_AVAILABLE_CHUNKS: ChunkOption[] = [];

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
 * URL sync, comment/chunk tabs, deep-link) live in `../_hooks`; this component
 * wires them to the shared notation/navigation hooks and lays out the result.
 *
 * In `local` mode (result screen) there is no persisted game to anchor
 * comments/chunks/likes to, so the social collections are empty and the
 * discussion / per-move contribution regions are replaced by `social.shareCta`.
 */
export function GameReview({
  moves,
  startingFen,
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

  // Social inputs, empty in `local` mode so the existing body — the discussion
  // rollup, deep-link, per-move contributions — naturally collapses to nothing
  // (a `local` game has no server-anchored comments/chunks). `viewerIsAuthenticated`
  // drives the stats auth-gate in both modes.
  const isLive = social.mode === 'live';
  const gameId = isLive ? social.gameId : '';
  const comments = isLive ? social.comments : NO_COMMENTS;
  const gameChunks = isLive ? social.gameChunks : NO_CHUNKS;
  const availableChunks = isLive ? social.availableChunks : NO_AVAILABLE_CHUNKS;
  const currentUser = isLive ? social.currentUser : null;
  const isGameOwner = isLive ? social.isGameOwner : false;
  const highlightCommentId = isLive ? social.highlightCommentId : undefined;
  const viewerIsAuthenticated = isLive ? social.currentUser != null : social.isAuthenticated;

  // One-step help tour explaining the "As played" toggle (board obfuscation).
  const reproduceViewTourSteps: HelpStep[] = [
    {
      targetId: 'replay-reproduce-view',
      title: t('playSettings.tour.reproduceView.title'),
      description: t('playSettings.tour.reproduceView.description'),
      side: 'top',
      align: 'end',
    },
  ];

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

  // Seed the board orientation from the `?color=white|black` param:
  // `effectiveFlipped` means "black is at the bottom", and the default (no
  // param) is the player's own side. Convert the requested orientation into
  // the manual-toggle seed `useBoardFlip` expects (which it inverts again for a
  // black player).
  const initialFlipped = useMemo(() => {
    if (!orientation) return false;
    const wantBlackAtBottom = orientation === 'black';
    return playerColor === 'black' ? !wantBlackAtBottom : wantBlackAtBottom;
  }, [orientation, playerColor]);
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

  const lichessAnalysisUrl = fenToLichessUrl(
    currentPosition === -1 || displayFen === null ? latestFen : displayFen
  );

  // Same game-statistics overview as the result screen, derived from the
  // per-move operation logs. The effort strip jumps the inline board.
  const stats = useMemo(() => computeGameStats(operationLogs ?? []), [operationLogs]);
  const playerMoveIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < notationMoves.length; i++) {
      if (getMovingSide(i, startingFen ?? undefined) === playerColor) indices.push(i);
    }
    return indices;
  }, [notationMoves, startingFen, playerColor]);

  // Map the board's navigation position to the ply the comment thread anchors
  // to: a concrete move (0-based), the last move when viewing the latest
  // position, or the whole game (null) at the start.
  const currentPly =
    currentPosition >= 0
      ? currentPosition
      : currentPosition === -1
        ? notationMoves.length > 0
          ? notationMoves.length - 1
          : null
        : null;

  // The game's move played from the position currently on the board — seeded
  // as a puzzle's draft solution by CreateFromPositionMenu. `appliedPlies` is
  // the half-move count to reach the displayed position; undefined at the
  // latest position (no continuation) or an empty game.
  const appliedPlies =
    currentPosition >= 0 ? currentPosition + 1 : currentPosition === -2 ? 0 : notationMoves.length;
  const continuationSan =
    appliedPlies < notationMoves.length ? notationMoves[appliedPlies] : undefined;

  // Label the move with its PGN-style number prefix: white → "1. d4",
  // black → "1...d5" (derived from the starting FEN's side + fullmove).
  const moveLabel = useMemo(() => {
    if (currentPly == null) return null;
    const san = notationMoves[currentPly];
    if (!san) return null;
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    const { moveNumber, isWhiteMove } = computeMoveNumber(
      currentPly,
      startsAsBlack,
      startMoveNumber
    );
    return isWhiteMove ? `${moveNumber}. ${san}` : `${moveNumber}...${san}`;
  }, [currentPly, notationMoves, startingFen]);

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
  });

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
        opening={detectedOpening}
        locale={locale}
        playSettingsLog={playSettingsLog ?? undefined}
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

  // Overview discussion feed: all comments + chunk links rolled up by move.
  // The overview offers a [Summary | Discussion] segmented switch when both the
  // stats and some activity exist; otherwise it shows whichever is non-empty.
  const discussionGroups = useMemo(
    () => buildDiscussionGroups(comments, gameChunks),
    [comments, gameChunks]
  );
  const discussionCount = useMemo(
    () => discussionGroups.reduce((n, g) => n + g.comments.length + g.chunks.length, 0),
    [discussionGroups]
  );
  const hasSummary = statsOverview !== null;
  const hasDiscussion = discussionGroups.length > 0;
  const showOverviewTabs = hasSummary && hasDiscussion;
  // Lead with the discussion when there is any (this is an advice page);
  // fall back to the stats summary otherwise.
  const [overviewView, setOverviewView] = useState<'summary' | 'discussion'>(
    hasDiscussion ? 'discussion' : 'summary'
  );
  const activeOverviewView = showOverviewTabs
    ? overviewView
    : hasDiscussion
      ? 'discussion'
      : 'summary';

  // Commit a previewed position from the quick-peek modal onto the live board.
  // In `live` mode moving to a move position already surfaces that move's
  // comment thread below the board; `local` mode has no per-move thread and a
  // position-independent overview, so it additionally switches to the Discussion
  // tab — matching the shared game, where opening a position reveals discussion.
  const { commit: commitQuickPeek } = quickPeek;
  const handleCommitPosition = useCallback(() => {
    commitQuickPeek();
    if (social.mode === 'local') setOverviewView('discussion');
  }, [commitQuickPeek, social.mode]);

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
            onNavigateToStart={navigateToStart}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onNavigateToEnd={navigateToEnd}
            onNavigateToPosition={navigateToPosition}
            onFlipBoard={toggleFlip}
            hiddenPieceStyle={hiddenPieceStyle}
            alwaysOpen
          />

          {/* How this game was played, at the position currently on the board.
              Sits directly under the board and updates as the viewer steps
              through the moves. The switch on the right reproduces the player's
              view (piece obfuscation) on the board itself. */}
          {showPlaySettings && effectivePlaySettings && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <PlaySettingsIndicator settings={effectivePlaySettings} playerColor={playerColor} />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  role="switch"
                  data-tour-id="replay-reproduce-view"
                  aria-checked={reproduceView}
                  onClick={() => setReproduceView((v) => !v)}
                  className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span>{t('playSettings.reproduceView')}</span>
                  <span
                    aria-hidden
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      reproduceView ? 'bg-foreground' : 'bg-secondary'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                        reproduceView ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
                <HelpTourButton
                  steps={reproduceViewTourSteps}
                  label={t('playSettings.tour.label')}
                />
              </div>
            </div>
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
              onNavigateToPosition: navigateToPosition,
              onNavigateToStart: navigateToStart,
              onNavigatePrevious: navigatePrevious,
              onNavigateNext: navigateNext,
              onNavigateToEnd: navigateToEnd,
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
            operations={{ logs: operationLogs ?? [], playerSide: playerColor }}
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

          <div role="tablist" className={tabsRowClass.underline}>
            {(['summary', 'discussion'] as const).map((view) => {
              const isActive = overviewView === view;
              const label =
                view === 'summary' ? t('overview.summaryTab') : t('overview.discussionTab');
              return (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setOverviewView(view)}
                  className={tabItemClass('underline', isActive)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {overviewView === 'summary' && gatedStats}
          {overviewView === 'discussion' && social.discussionContent}
        </div>
      ) : /* On a move position: that move's comment thread, directly under the
          move list. On the opening board: the description + statistics. */
      isInitialPosition ? (
        <>
          {children}

          {showOverviewTabs && (
            <div role="tablist" className={tabsRowClass.underline}>
              {(['summary', 'discussion'] as const).map((view) => {
                const isActive = activeOverviewView === view;
                const label =
                  view === 'summary'
                    ? t('overview.summaryTab')
                    : `${t('overview.discussionTab')} (${discussionCount})`;
                return (
                  <button
                    key={view}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setOverviewView(view)}
                    className={tabItemClass('underline', isActive)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {activeOverviewView === 'summary' && gatedStats}

          {activeOverviewView === 'discussion' && hasDiscussion && (
            <GameDiscussionFeed
              comments={comments}
              gameChunks={gameChunks}
              notationMoves={notationMoves}
              startingFen={startingFen}
              onJumpToPly={navigateToPosition}
              locale={locale}
            />
          )}
        </>
      ) : (
        currentPly != null && (
          <div className="space-y-4">
            <SectionTitle>{moveLabel ?? t('comments.title')}</SectionTitle>

            {/* Author something from the position currently on the board —
                chunk / position-memory / puzzle. Signed-in only, mirroring the
                chunk picker's gate. */}
            {currentUser && (
              <CreateFromPositionMenu
                locale={locale}
                currentFen={displayFen ?? latestFen}
                continuationSan={continuationSan}
              />
            )}

            {/* Posted comments and chunk links shown serially; only the
                composer (post a comment vs link a chunk) is toggled. */}
            <GameMoveContributions
              gameId={gameId}
              currentPly={currentPly}
              comments={comments}
              gameChunks={gameChunks}
              availableChunks={availableChunks}
              currentUser={currentUser}
              isGameOwner={isGameOwner}
              locale={locale}
            />
          </div>
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
        preferences={boardPreferences}
        hiddenPieceStyle={hiddenPieceStyle}
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
