'use client';

import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';

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
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useReplayDeepLink } from '../_hooks/use-replay-deep-link';
import { useReplayPreferences } from '../_hooks/use-replay-preferences';
import { useReplayUrlSync } from '../_hooks/use-replay-url-sync';
import { CreateFromPositionMenu } from './CreateFromPositionMenu';
import type { CommentUser } from './GameCommentContext';
import { GameMoveContributions } from './GameMoveContributions';
import { PlaySettingsIndicator } from './PlaySettingsIndicator';

type Props = {
  /** Published game id, used to anchor the per-move comment threads. */
  gameId: string;
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
  /** Side at the bottom of the board, from the `?color=white|black` URL param. */
  orientation?: 'white' | 'black';
  /** Rendered between the board/move-list and the stats overview (e.g. the description). */
  children?: ReactNode;
};

/**
 * Replay of a published game, laid out exactly like games/play: the in-play
 * always-visible board (`InlineBoardView`) in a 2/3 column and the move list
 * (`MovesPanel`) in a 1/3 column, driven by the same notation / navigation
 * hooks. The two-column layout keeps the board at the same comfortable size as
 * the play screen on desktop, and clicking a move in the list reflects on the
 * board.
 *
 * Read-only adaptation: `gameInProgress` is false (no "restart from here"), and
 * "new game from here" starts a fresh game from that position so a viewer can
 * try it themselves. Preferences are the viewer's own but forced fully revealed
 * — this is a finished public game, not a live blindfold one (see
 * `useReplayPreferences`). The replay's cross-cutting concerns (preferences,
 * URL sync, comment/chunk tabs, deep-link) live in `../_hooks`; this component
 * wires them to the shared notation/navigation hooks and lays out the result.
 */
export function GameReplay({
  gameId,
  moves,
  startingFen,
  playerColor,
  detectedOpening,
  engineConfig,
  operationLogs,
  playSettings,
  playSettingsLog,
  locale,
  comments,
  gameChunks,
  availableChunks,
  currentUser,
  isGameOwner,
  highlightCommentId,
  orientation,
  children,
}: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();
  const { preferences } = useGamePreferences();

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

  // Independent navigation state for the By Move quick-peek modal, so previewing
  // a position there never disturbs the live replay (board, comments, URL). The
  // modal commits to the live replay only via its footer CTA.
  const modalNav = useMoveNavigation({
    moves: notationMoves,
    startingFen: startingFen ?? undefined,
  });
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const boardColumnRef = useRef<HTMLDivElement>(null);

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
  const modalLastMove = useMemo(
    () => lastMoveAt(modalNav.currentPosition),
    [lastMoveAt, modalNav.currentPosition]
  );

  // By Move tap → quick-peek the position in a modal (matches the result page),
  // leaving the live replay untouched. The modal drives `modalNav`.
  const handleViewMove = useCallback(
    (movesIndex: number) => {
      modalNav.navigateToPosition(movesIndex);
      setIsBoardModalOpen(true);
    },
    [modalNav]
  );

  // Modal footer CTA → commit the modal's position to the live replay (board +
  // comment thread), close the modal, and scroll the board into view so the
  // comments below it are reachable. rAF defers the scroll until the modal's
  // scroll-lock has been released on this render.
  const handleOpenModalPosition = useCallback(() => {
    navigateToPosition(modalNav.currentPosition);
    setIsBoardModalOpen(false);
    requestAnimationFrame(() => {
      boardColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [navigateToPosition, modalNav]);

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
        onSelectMove={handleViewMove}
        engineConfig={engineConfig}
        playSettings={playSettings ?? undefined}
        playerColor={playerColor}
        opening={detectedOpening}
        locale={locale}
        playSettingsLog={playSettingsLog ?? undefined}
        headingAsSection
      />
    ) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2" ref={boardColumnRef}>
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
            alwaysOpen
          />

          {/* How this game was played, at the position currently on the board.
              Sits directly under the board and updates as the viewer steps
              through the moves. The switch on the right reproduces the player's
              view (piece obfuscation) on the board itself. */}
          {showPlaySettings && effectivePlaySettings && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <PlaySettingsIndicator settings={effectivePlaySettings} playerColor={playerColor} />
              <button
                type="button"
                role="switch"
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

      {/* On a move position: that move's comment thread, directly under the
          move list. On the opening board: the description + statistics. */}
      {isInitialPosition ? (
        <>
          {children}

          {statsOverview &&
            (currentUser ? (
              statsOverview
            ) : (
              <StatsAuthGate title={t('statsGate.title')} description={t('statsGate.description')}>
                {statsOverview}
              </StatsAuthGate>
            ))}
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
              currentFen={displayFen ?? latestFen}
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
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        fen={modalNav.displayFen ?? latestFen}
        playerSide={playerColor}
        flipped={effectiveFlipped}
        lastMove={modalLastMove}
        preferences={boardPreferences}
        movesLength={notationMoves.length}
        currentPosition={modalNav.currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={modalNav.navigateToStart}
        onNavigatePrevious={modalNav.navigatePrevious}
        onNavigateNext={modalNav.navigateNext}
        onNavigateToEnd={modalNav.navigateToEnd}
        onNavigateToPosition={modalNav.navigateToPosition}
        onFlipBoard={toggleFlip}
        footer={
          <button
            type="button"
            onClick={handleOpenModalPosition}
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
