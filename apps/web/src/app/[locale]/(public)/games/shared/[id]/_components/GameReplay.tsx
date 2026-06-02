'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl, getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';
import type { EngineConfig } from '@/lib/engines';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import { gameUsedNotablePlaySettings, playSettingsAtHalfMove } from '@/lib/games/play-settings-log';
import type {
  GamePlaySettings,
  MoveOperationLog,
  PlaySettingsChangeEntry,
} from '@/lib/games/saved-game-types';

import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { MovesPanel } from '@/app/[locale]/(public)/games/play/_components/MovesPanel';
import { OperationLogModal } from '@/app/[locale]/(public)/games/play/_components/OperationLogModal';
import {
  useBoardFlip,
  useMoveNavigation,
  useNotation,
} from '@/app/[locale]/(public)/games/play/_hooks';
import { buildNewGameFromPositionUrl } from '@/app/[locale]/(public)/games/play/_lib/build-new-game-from-position-url';
import { getMovingSide, parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { computeMoveNumber } from '@/app/[locale]/(public)/games/play/postmortem/_lib/compute-move-number';
import { GameStatsOverview } from '@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameChunkSection } from './GameChunkSection';
import { type CommentUser, GameCommentThread } from './GameCommentThread';
import { PlaySettingsIndicator } from './PlaySettingsIndicator';

/**
 * Parse the URL hash (`#14`) into a 0-based move index, or null when it is
 * absent / not a valid half-move number for this game.
 */
function parseHashPly(hash: string, moveCount: number): number | null {
  const raw = hash.replace(/^#/, '');
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 1 || n > moveCount) return null;
  return n - 1;
}

type Props = {
  /** Published game id, used to anchor the per-move comment threads. */
  gameId: string;
  moves: string[];
  startingFen: string | null;
  playerColor: 'white' | 'black';
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
 * — this is a finished public game, not a live blindfold one.
 */
export function GameReplay({
  gameId,
  moves,
  startingFen,
  playerColor,
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  // When on, the board reproduces how the player actually saw this position
  // (piece obfuscation) instead of the default fully-revealed view. The board
  // panel itself stays visible (this is a replay), so only the piece-level
  // settings are reflected — see `reflectedPreferences`.
  const [reproduceView, setReproduceView] = useState(false);

  const revealedPreferences = useMemo<GamePreferences>(
    () => ({
      ...preferences,
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
      boardVisibility: 'always',
    }),
    [preferences]
  );

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

  // Open at the opening board (the game's starting position, which shows the
  // description + stats) so every visitor lands on the same overview and steps
  // forward into the moves from there — unless deep-linked to a comment (from a
  // like notification) or the `#<half-move>` hash, which open at that move.
  // Runs once after the moves load.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || notationMoves.length === 0) return;
    startedRef.current = true;
    // Priority: a deep-linked comment's move, then the `#<half-move>` URL hash
    // (read client-side — the fragment never reaches the server), then move 1.
    const target = highlightCommentId
      ? comments.find((c) => c.id === highlightCommentId)
      : undefined;
    const commentPly =
      target && target.ply != null && target.ply < notationMoves.length ? target.ply : null;
    const hashPly = parseHashPly(window.location.hash, notationMoves.length);
    // -2 is the opening board (the starting position, with description + stats).
    navigateToPosition(commentPly ?? hashPly ?? -2);
  }, [notationMoves.length, navigateToPosition, highlightCommentId, comments]);

  // Gate the URL-sync effects below so they only fire on genuine post-load
  // changes (user navigation / flip). Next's App Router resets the URL to the
  // navigation target once the initial render settles, so any URL write during
  // load is reverted anyway — and writing the initial move/orientation would
  // just be a visible flicker. Shared links keep their state because it is in
  // the loaded URL itself, not written client-side.
  const syncReadyRef = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      syncReadyRef.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Reflect the move on the board in the URL hash (`#<half-move>`), Lichess-
  // style (e.g. `/games/shared/<id>#14`), so the address bar tracks navigation
  // and the link can be shared to open at a specific move. Uses replaceState
  // (no server round-trip / history spam).
  useEffect(() => {
    if (!syncReadyRef.current) return;
    const moveNumber =
      currentPosition >= 0
        ? currentPosition + 1
        : currentPosition === -1
          ? notationMoves.length
          : 0;
    const url = new URL(window.location.href);
    url.searchParams.delete('comment');
    url.hash = moveNumber > 0 ? String(moveNumber) : '';
    window.history.replaceState(window.history.state, '', url);
  }, [currentPosition, notationMoves.length]);

  // Reflect the board orientation in the URL as `?color=white|black` once the
  // viewer flips. A query param (not a path segment) is used because Next's App
  // Router reverts a client-side pathname change to a different route; updating
  // searchParams via replaceState is supported and leaves the `#move` hash
  // intact. Like the move hash, only written post-load (see syncReadyRef).
  useEffect(() => {
    if (!syncReadyRef.current) return;
    const orientationColor = effectiveFlipped ? 'black' : 'white';
    const url = new URL(window.location.href);
    url.searchParams.set('color', orientationColor);
    window.history.replaceState(window.history.state, '', url);
  }, [effectiveFlipped]);

  // Highlight the move that produced the displayed position.
  const lastMove = useMemo(() => {
    if (currentPosition === -2) return null;
    const upto =
      currentPosition === -1 ? notationMoves : notationMoves.slice(0, currentPosition + 1);
    if (upto.length === 0) return null;
    return getLastMoveDetails(upto as string[], startingFen ?? undefined);
  }, [currentPosition, notationMoves, startingFen]);

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
  // "How the player saw this position": the effective blindfold settings at the
  // displayed half-move, folded from the start-of-game snapshot plus the
  // mid-game change log. Position-aware — it updates as the viewer steps,
  // because settings could change mid-game (e.g. start sighted, then hide the
  // opponent's pieces). Shown only when the game ever used non-default settings;
  // a game that was fully sighted throughout has nothing to surface.
  const showPlaySettings =
    playSettings != null && gameUsedNotablePlaySettings(playSettings, playSettingsLog);
  const effectivePlaySettings = useMemo<GamePlaySettings | null>(() => {
    if (!playSettings) return null;
    const halfMovesShown =
      currentPosition >= 0
        ? currentPosition + 1
        : currentPosition === -1
          ? notationMoves.length
          : 0;
    return playSettingsAtHalfMove(playSettings, playSettingsLog, halfMovesShown);
  }, [playSettings, playSettingsLog, currentPosition, notationMoves.length]);

  // Board preferences that reproduce the player's view at this position: the
  // viewer's own base preferences with the game's piece obfuscation applied.
  // `boardVisibility` is intentionally left untouched (the replay board is
  // `alwaysOpen`), so 'peek' / 'never' games still show the board here — only
  // the piece-level settings (which side was shown, shape, color) are mirrored.
  const reflectedPreferences = useMemo<GamePreferences | null>(() => {
    if (!effectivePlaySettings) return null;
    return {
      ...preferences,
      showOwnPieces: effectivePlaySettings.showOwnPieces,
      showOpponentPieces: effectivePlaySettings.showOpponentPieces,
      pieceShapeMode: effectivePlaySettings.pieceShapeMode,
      pieceColors: effectivePlaySettings.pieceColors,
    };
  }, [preferences, effectivePlaySettings]);

  const boardPreferences =
    reproduceView && reflectedPreferences ? reflectedPreferences : revealedPreferences;

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

  // The move panel is tabbed: discussion (comments) vs applicable chunks. Both
  // datasets are already loaded, so the counts and the smart default are pure
  // client-side filtering — no extra queries.
  const commentCount = useMemo(
    () => comments.filter((c) => c.ply === currentPly && c.deletedAt === null).length,
    [comments, currentPly]
  );
  const chunkCount = useMemo(
    () => gameChunks.filter((c) => c.ply === currentPly).length,
    [gameChunks, currentPly]
  );
  const [activeMoveTab, setActiveMoveTab] = useState<'comments' | 'chunks'>('comments');
  // Default to comments, but open straight to chunks on a move that has chunks
  // and no comments. Re-evaluated per move (manual switches persist within a move).
  useEffect(() => {
    setActiveMoveTab(commentCount === 0 && chunkCount > 0 ? 'chunks' : 'comments');
  }, [currentPly, commentCount, chunkCount]);

  // Once the deep-linked comment's move is on the board (its thread mounted),
  // scroll it into view. Runs once.
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (!highlightCommentId || scrolledRef.current || isInitialPosition) return;
    const el = document.getElementById(`game-comment-${highlightCommentId}`);
    if (!el) return;
    scrolledRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightCommentId, isInitialPosition, currentPosition]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
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

          {stats.totalMoves > 0 && (
            <GameStatsOverview
              stats={stats}
              playerMoveIndices={playerMoveIndices}
              moves={notationMoves}
              onSelectMove={navigateToPosition}
              onViewDetails={() => setDetailsOpen(true)}
            />
          )}
        </>
      ) : (
        currentPly != null && (
          <div className="space-y-4">
            <SectionTitle>{moveLabel ?? t('comments.title')}</SectionTitle>

            {/* Discussion vs applicable chunks, tabbed to save vertical space.
                Both panels stay mounted (toggled via `hidden`) so their
                optimistic state survives a tab switch. */}
            <div
              role="tablist"
              aria-label={moveLabel ?? undefined}
              className="flex rounded-lg bg-secondary p-1"
            >
              {(['comments', 'chunks'] as const).map((tab) => {
                const count = tab === 'comments' ? commentCount : chunkCount;
                const emoji = tab === 'comments' ? '💬' : '🧠';
                const name = tab === 'comments' ? t('comments.title') : t('chunks.badge');
                const label = `${emoji} ${name}${count > 0 ? ` (${count})` : ''}`;
                const isActive = activeMoveTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveMoveTab(tab)}
                    className={`flex-1 truncate rounded-md px-2 py-2 text-center text-sm font-medium transition-colors md:px-4 ${
                      isActive
                        ? 'bg-card text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className={activeMoveTab === 'comments' ? '' : 'hidden'}>
              <GameCommentThread
                gameId={gameId}
                currentPly={currentPly}
                comments={comments}
                currentUser={currentUser}
                locale={locale}
              />
            </div>
            <div className={activeMoveTab === 'chunks' ? '' : 'hidden'}>
              <GameChunkSection
                gameId={gameId}
                currentPly={currentPly}
                chunks={gameChunks}
                availableChunks={availableChunks}
                currentUserId={currentUser?.id}
                isGameOwner={isGameOwner}
                locale={locale}
              />
            </div>
          </div>
        )
      )}

      {/* Game details — same modal as the result screen (opponent shown). The
          per-position blindfold settings are surfaced inline above the board
          (PlaySettingsIndicator), so the modal's per-game settings panel stays
          unwired here. */}
      <OperationLogModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        engineConfig={engineConfig}
      />
    </div>
  );
}
