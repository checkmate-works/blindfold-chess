'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import { FaChartLine, FaChessBoard, FaMinus, FaTimes } from 'react-icons/fa';

import { engineConfigToUrlParams } from '@/lib/engines';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';
import type { Game } from '@/lib/games/saved-game-types';

import { Divider } from '@/app/[locale]/_components/Divider';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardViewModal } from '../../_components/BoardViewModal';
import { OperationLogModal } from '../../_components/OperationLogModal';
import { useBoardFlip, useMoveNavigation, useNotation } from '../../_hooks';
import { buildPostmortemPath } from '../../_lib';
import { getMovingSide } from '../../_lib/fen-utils';
import { useLoadGame } from '../_hooks/useLoadGame';
import { computeGameStats } from '../_lib/compute-game-stats';
import { GameStatsOverview } from './GameStatsOverview';
import { ResultSkeleton } from './ResultSkeleton';
import { VictoryCertificate } from './VictoryCertificate';

/**
 * Board display for the result-page position preview: fully revealed (the
 * game is over, so blindfold obfuscation no longer serves a purpose). Only
 * the board-appearance fields are read by {@link BoardViewModal}; the rest
 * satisfy the GamePreferences shape.
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
  breadcrumb: ReactNode;
};

export function ResultClient({ locale, displayName, breadcrumb }: Props) {
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
      breadcrumb={breadcrumb}
    />
  );
}

type ResultContentProps = {
  game: Game;
  gameId: string;
  locale: Locale;
  displayName: string;
  breadcrumb: ReactNode;
};

function ResultContent({ game, gameId, locale, displayName, breadcrumb }: ResultContentProps) {
  const t = useTranslations('play');
  const tGames = useTranslations('gamesPage');
  const router = useRouter();
  const [isOperationLogVisible, setIsOperationLogVisible] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

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
          <VictoryCertificate displayName={displayName} engineConfig={game.engineConfig} />
        )}
        {playerResult !== 'win' && (
          <div className="py-6 text-center flex flex-col items-center gap-3">
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

        {/* Game statistics overview — metric cards + per-move effort strip. */}
        {stats.totalMoves > 0 && (
          <>
            <div className="border-t border-border" />
            <GameStatsOverview
              stats={stats}
              playerMoveIndices={playerMoveIndices}
              moves={moves}
              onSelectMove={handleViewMove}
              onViewDetails={() => setIsOperationLogVisible(true)}
            />
          </>
        )}

        <div className="border-t border-border" />

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {moves.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              icon={<FaChartLine className="w-5 h-5" />}
              onClick={handlePostmortem}
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
          <Link href={`/${locale}/games`} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {tGames('pageTitle')}
          </Link>
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
        preferences={REVEALED_BOARD_PREFS}
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

      <Divider />
      {breadcrumb}
    </div>
  );
}
