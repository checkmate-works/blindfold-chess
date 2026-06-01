'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { ExpInfo } from '@blindfold-chess/features/exp';
import { FaChartLine, FaChessBoard, FaMinus, FaTimes } from 'react-icons/fa';

import { engineConfigToUrlParams } from '@/lib/engines';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import type { Game } from '@/lib/games/saved-game-types';
import { getSharedGame } from '@/lib/games/shared-game-store';

import { ExpGainDisplay } from '@/app/[locale]/(public)/practice/_components/ExpGainDisplay';
import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardViewModal } from '../../_components/BoardViewModal';
import { OperationLogModal } from '../../_components/OperationLogModal';
import { useBoardFlip, useMoveNavigation, useNotation } from '../../_hooks';
import { buildPostmortemPath } from '../../_lib';
import { getMovingSide } from '../../_lib/fen-utils';
import { useGameExpGrant } from '../_hooks/use-game-exp-grant';
import { useLoadGame } from '../_hooks/useLoadGame';
import { GameStatsOverview } from './GameStatsOverview';
import { ResultSkeleton } from './ResultSkeleton';
import { StatsAuthGate } from './StatsAuthGate';
import { VictoryCertificate } from './VictoryCertificate';

/**
 * Board display for the result-page position preview: fully revealed (the
 * game is over, so blindfold obfuscation no longer serves a purpose). Only
 * the board-appearance fields are read by {@link BoardViewModal}; the rest
 * satisfy the GamePreferences shape.
 *
 * `boardTheme` here is only a fallback: the preview board overrides it with
 * the user's live global theme (a global setting absent from the per-game
 * snapshot) at the call site, so the modal matches the rest of the app — see
 * `boardPreferences` in {@link ResultContent}.
 */
const REVEALED_BOARD_PREFS: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: DEFAULT_BOARD_THEME,
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  moveInputMode: 'text',
  enabledMoveInputModes: ['text'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: 'always',
  peekMode: 'modal',
};

type Props = {
  locale: Locale;
  displayName: string;
  /** Whether the viewer is signed in. Anonymous viewers get the stats gated behind a sign-up CTA. */
  isAuthenticated: boolean;
  /** Exp already granted for this game (resolved server-side on revisit), or null. */
  initialExp: ExpInfo | null;
};

export function ResultClient({ locale, displayName, isAuthenticated, initialExp }: Props) {
  const t = useTranslations('play');
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');
  const loadState = useLoadGame(gameId);

  if (loadState.status === 'idle' || loadState.status === 'loading') {
    return <ResultSkeleton />;
  }

  if (loadState.status === 'error') {
    const message =
      loadState.error === 'missing-id' ? t('result.gameIdMissing') : t('result.gameNotFound');
    return (
      <div className="text-center">
        <p className="text-muted-foreground mt-4">{message}</p>
      </div>
    );
  }

  // gameId is guaranteed non-null when status === 'loaded'.
  return (
    <ResultContent
      game={loadState.game}
      gameId={gameId as string}
      locale={locale}
      displayName={displayName}
      isAuthenticated={isAuthenticated}
      initialExp={initialExp}
    />
  );
}

type ResultContentProps = {
  game: Game;
  gameId: string;
  locale: Locale;
  displayName: string;
  isAuthenticated: boolean;
  initialExp: ExpInfo | null;
};

function ResultContent({
  game,
  gameId,
  locale,
  displayName,
  isAuthenticated,
  initialExp,
}: ResultContentProps) {
  const t = useTranslations('play');
  const router = useRouter();
  const [isOperationLogVisible, setIsOperationLogVisible] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  // Postmortem is a members-only feature; anonymous viewers get a sign-up
  // prompt instead of the review screen.
  const { guardAction, isModalOpen: isAuthModalOpen, closeModal: closeAuthModal } = useAuthGuard();

  // The position-preview board should match the user's configured board theme
  // for visual consistency with the rest of the app. The theme is a global
  // setting (not captured in the per-game snapshot), so read it live from
  // GamePreferencesContext and override the revealed-board defaults.
  const { preferences: globalPreferences } = useGamePreferences();
  const boardPreferences = useMemo<GamePreferences>(
    () => ({ ...REVEALED_BOARD_PREFS, boardTheme: globalPreferences.boardTheme }),
    [globalPreferences.boardTheme]
  );

  // Derive player result from game status
  const playerResult = game.status === 'win' ? 'win' : game.status === 'loss' ? 'loss' : 'draw';

  // Notation hook - game is guaranteed to be loaded here
  const { moves, formattedPgn } = useNotation({
    initialMoves: game.moves,
    startingFen: game.startingFen,
  });

  // Board navigation for the position-preview modal (tapping an effort-strip
  // cell opens this modal at that move; the user can then step through the
  // whole game without leaving the result page).
  const {
    currentPosition,
    displayFen,
    latestFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
  } = useMoveNavigation({ moves, startingFen: game.startingFen });
  const { effectiveFlipped, toggleFlip } = useBoardFlip({ playerSide: game.playerColor });

  // Highlight the move that produced the displayed position.
  const previewLastMove = useMemo(() => {
    if (currentPosition === -2) return null;
    const upto = currentPosition === -1 ? moves : moves.slice(0, currentPosition + 1);
    if (upto.length === 0) return null;
    return getLastMoveDetails(upto as string[], game.startingFen);
  }, [currentPosition, moves, game.startingFen]);

  // Effort-strip tap → preview that position in a modal (no page transition).
  const handleViewMove = useCallback(
    (movesIndex: number) => {
      navigateToPosition(movesIndex);
      setIsBoardModalOpen(true);
    },
    [navigateToPosition]
  );

  // Overview stats, derived purely from the persisted per-move operation logs.
  const stats = useMemo(() => computeGameStats(game.operationLogs ?? []), [game.operationLogs]);

  // Grant (once) and display the Exp earned for this game. Guests get null
  // (no grant) and a sign-in nudge instead; see the JSX below.
  const exp = useGameExpGrant({ gameId, game, stats, isAuthenticated, initialExp });

  // Has this game already been shared from this browser? Read client-side after
  // mount (localStorage) so the share link can point at the published game
  // instead of offering to publish it again. Null on the server / first render.
  const [sharedPublishedId, setSharedPublishedId] = useState<string | null>(null);
  useEffect(() => {
    setSharedPublishedId(getSharedGame(gameId)?.publishedId ?? null);
  }, [gameId]);

  // moves[] index of each player move, so an effort-strip cell (one per player
  // move) can deep-link to that exact position in the finished-game view.
  const playerMoveIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < game.moves.length; i++) {
      if (getMovingSide(i, game.startingFen) === game.playerColor) indices.push(i);
    }
    return indices;
  }, [game.moves.length, game.startingFen, game.playerColor]);

  // Handlers
  const handlePostmortem = useCallback(() => {
    router.push(
      buildPostmortemPath({
        locale,
        formattedPgn,
        playerColor: game.playerColor,
        moves: game.moves,
        engineConfig: game.engineConfig,
        gameId,
        startingFen: game.startingFen,
      })
    );
  }, [game, formattedPgn, gameId, locale, router]);

  // Reopen the finished game in the familiar game UI (read-only). Mirrors the
  // games-list params and adds `finished=1` so PlayClient renders the
  // finished-game view instead of bouncing back here. See PlayClient.
  const openFinishedGame = useCallback(() => {
    const params = new URLSearchParams({
      color: game.playerColor,
      ...engineConfigToUrlParams(game.engineConfig),
      moves: JSON.stringify(game.moves),
      gameId,
      finished: '1',
    });
    router.push(`/${locale}/games/play?${params.toString()}`);
  }, [game, gameId, locale, router]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        {/* Game Result */}
        {playerResult === 'win' && (
          // The certificate-frame webp has a large transparent bottom margin
          // (~10.5% of its 3:2 height ≈ 7% of the box width) that pushed the
          // share link far below the visible frame. A width-relative negative
          // margin (-mb-[7%]) trims exactly that band at every screen size, so
          // the gap above the link matches the gap to the divider below.
          <div className="-mb-[7%]">
            <VictoryCertificate displayName={displayName} engineConfig={game.engineConfig} />
          </div>
        )}
        {playerResult !== 'win' && (
          <div className="pt-6 text-center flex flex-col items-center gap-3">
            {playerResult === 'loss' && (
              <>
                <FaTimes className="w-12 h-12 text-destructive" />
                <h3 className="text-xl font-bold">{t('youLose')}</h3>
              </>
            )}
            {playerResult === 'draw' && (
              <>
                <FaMinus className="w-12 h-12 text-warning" />
                <h3 className="text-xl font-bold">{t('draw')}</h3>
              </>
            )}
          </div>
        )}

        {/* Share entry point — a subtle emoji link under the result banner
            rather than another full-width button, to avoid button clutter.
            Spacing comes from the parent gap-4 (equal above/below); the win
            certificate's wrapper trims its transparent bottom margin so the
            gap to it visually matches the gap to the divider below. */}
        {moves.length > 0 && (
          <div className="text-center">
            <Link
              href={
                sharedPublishedId
                  ? `/${locale}/games/shared/${sharedPublishedId}`
                  : `/${locale}/games/shared/new?gameId=${gameId}`
              }
              className={`inline-flex items-center gap-1.5 text-sm ${TEXT_LINK_MUTED_CLASSES}`}
            >
              <span aria-hidden>{sharedPublishedId ? '✅' : '🔗'}</span>
              {sharedPublishedId ? t('result.viewShared') : t('result.publish')}
            </Link>
          </div>
        )}

        {/* Game statistics overview — metric cards + per-move effort strip.
            Anonymous viewers see it blurred behind a sign-up CTA; the
            statistics are a registration nudge for game-only users. */}
        {stats.totalMoves > 0 && (
          <>
            <div className="border-t border-border" />
            {isAuthenticated ? (
              <GameStatsOverview
                stats={stats}
                playerMoveIndices={playerMoveIndices}
                moves={moves}
                onSelectMove={handleViewMove}
                onViewDetails={() => setIsOperationLogVisible(true)}
              />
            ) : (
              <StatsAuthGate>
                <GameStatsOverview
                  stats={stats}
                  playerMoveIndices={playerMoveIndices}
                  moves={moves}
                  onSelectMove={handleViewMove}
                  onViewDetails={() => setIsOperationLogVisible(true)}
                />
              </StatsAuthGate>
            )}
          </>
        )}

        {/* Exp earned for this game, shown below the statistics. Authenticated
            players only — ExpGainDisplay renders nothing until the grant
            resolves. Guests are already nudged to sign up by the StatsAuthGate
            above, so no separate Exp CTA is shown here. */}
        {isAuthenticated && <ExpGainDisplay expInfo={exp} />}

        <div className="border-t border-border" />

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {moves.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              icon={<FaChartLine className="w-5 h-5" />}
              onClick={() => guardAction(handlePostmortem)}
              className="w-full rounded-xl font-medium"
            >
              {t('postmortem')}
            </Button>
          )}
          {moves.length > 0 && (
            <Button
              variant="secondary"
              size="lg"
              icon={<FaChessBoard className="w-5 h-5" />}
              onClick={() => openFinishedGame()}
              className="w-full rounded-xl font-medium"
            >
              {t('result.openFinishedGame')}
            </Button>
          )}
        </div>
      </div>

      {/* Position-preview modal — opened by tapping an effort-strip cell.
          Reuses the in-game BoardViewModal (board + move navigation) so the
          user can inspect any position, and step through the game, without
          leaving the result page. The board is fully revealed here. */}
      <BoardViewModal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        fen={displayFen ?? latestFen}
        playerSide={game.playerColor}
        flipped={effectiveFlipped}
        lastMove={previewLastMove}
        preferences={boardPreferences}
        movesLength={moves.length}
        currentPosition={currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={navigateToStart}
        onNavigatePrevious={navigatePrevious}
        onNavigateNext={navigateNext}
        onNavigateToEnd={navigateToEnd}
        onNavigateToPosition={navigateToPosition}
        onFlipBoard={toggleFlip}
      />

      {/* Game Details Modal — Opponent + Initial Settings + Change Log.
          Per-move counts moved into MovesPanel inline popovers in Phase
          5b; the result page does not show MovesPanel, so per-move
          investigation lives in the postmortem flow instead. */}
      {game.operationLogs && (
        <OperationLogModal
          isOpen={isOperationLogVisible}
          onClose={() => setIsOperationLogVisible(false)}
          engineConfig={game.engineConfig}
          gamePreferences={game.gamePreferences}
          preferenceChangeLog={game.preferenceChangeLog}
        />
      )}

      {/* Sign-up prompt shown when an anonymous viewer taps the postmortem
          button (members-only feature). */}
      {isAuthModalOpen && <AuthPromptModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />}
    </div>
  );
}
