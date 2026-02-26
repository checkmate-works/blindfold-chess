'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/app/_components';
import { getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import { FaChartLine, FaCheck, FaEye, FaMinus, FaPlus, FaTimes } from 'react-icons/fa';

import { LocalStorageGameRepository } from '@/lib/repositories';
import type { Game } from '@/lib/types';

import { Divider } from '@/app/[locale]/_components/Divider';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { BoardViewModal } from '../../_components/BoardViewModal';
import { ClientBreadcrumb } from '../../_components/ClientBreadcrumb';
import { MovesPanel } from '../../_components/MovesPanel';
import { useMoveNavigation, useNotation } from '../../_hooks';
import type { FormattedPgnMove } from '../../_lib';

type Props = {
  locale: Locale;
};

export function ResultClient({ locale }: Props) {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId');

  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load game data from localStorage
  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided');
      setIsLoading(false);
      return;
    }

    const loadGame = async () => {
      const repo = new LocalStorageGameRepository();
      const loadedGame = await repo.load(gameId);
      if (!loadedGame) {
        setError('Game not found');
      } else {
        setGame(loadedGame);
      }
      setIsLoading(false);
    };

    loadGame();
  }, [gameId]);

  if (isLoading) {
    return null;
  }

  if (error || !game || !gameId) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground mt-4">{error || 'Game not found'}</p>
      </div>
    );
  }

  return <ResultContent game={game} gameId={gameId} locale={locale} />;
}

type ResultContentProps = {
  game: Game;
  gameId: string;
  locale: Locale;
};

function ResultContent({ game, gameId, locale }: ResultContentProps) {
  const t = useTranslations('play');
  const router = useRouter();
  const [isBoardVisible, setIsBoardVisible] = useState(false);

  // Derive player result from game status
  const playerResult = game.status === 'win' ? 'win' : game.status === 'loss' ? 'loss' : 'draw';

  // Notation hook - game is guaranteed to be loaded here
  const {
    moves,
    fen: currentFen,
    formattedPgn,
  } = useNotation({
    initialMoves: game.moves,
    startingFen: game.startingFen,
  });

  // Move navigation hook
  const {
    currentPosition,
    displayFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
  } = useMoveNavigation({
    moves,
    startingFen: game.startingFen,
  });

  // Last move details
  const lastMove = useMemo(
    () => getLastMoveDetails(moves as string[], game.startingFen),
    [moves, game.startingFen]
  );

  // Preferences
  const { preferences: globalPreferences } = useGamePreferences();
  const preferences: GamePreferences = useMemo(() => {
    if (!game.gamePreferences) return globalPreferences;
    return {
      ...globalPreferences,
      showBoardButtonInGame: game.gamePreferences.showBoardButtonInGame,
      highlightLastMove: game.gamePreferences.highlightLastMove,
      showOwnPieces: game.gamePreferences.showOwnPieces,
      showOpponentPieces: game.gamePreferences.showOpponentPieces,
      pieceShapeMode: game.gamePreferences.pieceShapeMode,
      pieceColors: game.gamePreferences.pieceColors,
    };
  }, [globalPreferences, game.gamePreferences]);

  // Handlers
  const handleNewGame = useCallback(() => {
    window.location.href = `/${locale}/games/new`;
  }, [locale]);

  const handlePostmortem = useCallback(() => {
    const pgnMoves = formattedPgn
      .map((move: FormattedPgnMove) => {
        const moveNumber = `${move.moveNumber}.`;
        if (!move.whiteMove && move.blackMove) {
          return `${moveNumber}.. ${move.blackMove}`;
        }
        const movePair = move.blackMove
          ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
          : `${moveNumber} ${move.whiteMove}`;
        return movePair;
      })
      .join(' ');

    const params = new URLSearchParams();
    params.set('pgn', pgnMoves);
    params.set('color', game.playerColor);
    params.set('autoOpponent', 'true');
    if (game.startingFen) params.set('fen', game.startingFen);
    params.set('gameId', gameId);
    params.set('skillLevel', game.skillLevel.toString());
    params.set('moves', JSON.stringify(game.moves));

    router.push(`/${locale}/play/postmortem?${params.toString()}`);
  }, [game, formattedPgn, gameId, locale, router]);

  const handleNewGameFromPosition = useCallback(
    (position: number) => {
      const movesToKeep = moves.slice(0, position + 1);
      const params = new URLSearchParams();
      params.set('moves', JSON.stringify(movesToKeep));
      params.set('color', game.playerColor);
      params.set('skillLevel', game.skillLevel.toString());
      if (game.startingFen) params.set('fen', game.startingFen);

      router.push(`/${locale}/games/new/pgn?${params.toString()}`);
    },
    [game, moves, locale, router]
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Result Area */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg p-4">
            <div className="flex flex-col gap-4">
              {/* Game Result */}
              <div className="py-8 text-center flex flex-col items-center gap-4">
                {playerResult === 'win' && (
                  <>
                    <FaCheck className="w-12 h-12 text-green-500" />
                    <h3 className="text-xl font-bold">{t('youWin')}</h3>
                  </>
                )}
                {playerResult === 'loss' && (
                  <>
                    <FaTimes className="w-12 h-12 text-red-500" />
                    <h3 className="text-xl font-bold">{t('youLose')}</h3>
                  </>
                )}
                {playerResult === 'draw' && (
                  <>
                    <FaMinus className="w-12 h-12 text-yellow-500" />
                    <h3 className="text-xl font-bold">{t('draw')}</h3>
                  </>
                )}
              </div>

              {/* Show Board Button */}
              <div className="flex gap-4 md:gap-2 justify-center">
                <button
                  onClick={() => setIsBoardVisible(true)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center justify-center gap-2"
                  title={t('showBoard')}
                >
                  <FaEye className="w-4 h-4" />
                  <span className="hidden md:inline">{t('showBoard')}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<FaPlus className="w-5 h-5" />}
                  onClick={handleNewGame}
                  className="w-full rounded-xl font-medium"
                >
                  {t('newGame')}
                </Button>
                {moves.length > 0 && (
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={<FaChartLine className="w-5 h-5" />}
                    onClick={handlePostmortem}
                    className="w-full rounded-xl font-medium"
                  >
                    {t('postmortem')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          <MovesPanel
            formattedPgn={formattedPgn}
            currentPosition={currentPosition}
            movesLength={moves.length}
            currentFen={currentFen}
            displayFen={displayFen}
            startingFen={game.startingFen}
            gameInProgress={false}
            onNavigateToPosition={navigateToPosition}
            onNavigateToStart={navigateToStart}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onNavigateToEnd={navigateToEnd}
            onRestartFromPosition={() => {}}
            onNewGameFromPosition={handleNewGameFromPosition}
          />
        </div>
      </div>

      {/* Board View Modal */}
      <BoardViewModal
        isOpen={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        fen={displayFen || currentFen}
        playerSide={game.playerColor}
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
      />

      <Divider />
      <ClientBreadcrumb
        items={[{ label: t('title'), href: '/play' }, { label: t('gameOver') }]}
        locale={locale}
      />
    </div>
  );
}
