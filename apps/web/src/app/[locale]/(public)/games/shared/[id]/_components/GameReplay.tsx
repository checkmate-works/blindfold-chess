'use client';

import { type ReactNode, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToLichessUrl, getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaChartLine } from 'react-icons/fa';

import type { EngineConfig } from '@/lib/engines';
import { computeGameStats } from '@/lib/games/compute-game-stats';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { MovesPanel } from '@/app/[locale]/(public)/games/play/_components/MovesPanel';
import { OperationLogModal } from '@/app/[locale]/(public)/games/play/_components/OperationLogModal';
import {
  useBoardFlip,
  useMoveNavigation,
  useNotation,
} from '@/app/[locale]/(public)/games/play/_hooks';
import { buildNewGameFromPositionUrl } from '@/app/[locale]/(public)/games/play/_lib/build-new-game-from-position-url';
import { buildPostmortemPath } from '@/app/[locale]/(public)/games/play/_lib/build-postmortem-path';
import { getMovingSide } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { GameStatsOverview } from '@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview';
import { AuthPromptModal } from '@/app/[locale]/_components/AuthPromptModal';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useAuthGuard } from '@/app/[locale]/_hooks/use-auth-guard';

type Props = {
  /** Published game id, used as the postmortem's gameId param. */
  gameId: string;
  moves: string[];
  startingFen: string | null;
  playerColor: 'white' | 'black';
  engineConfig: EngineConfig;
  operationLogs: MoveOperationLog[] | null;
  locale: string;
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
  locale,
  children,
}: Props) {
  const t = useTranslations('play');
  const router = useRouter();
  const { preferences } = useGamePreferences();
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Postmortem is members-only (same as the result screen); guests get a
  // sign-up prompt instead of the review screen.
  const { guardAction, isModalOpen: isAuthModalOpen, closeModal: closeAuthModal } = useAuthGuard();

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
  const { effectiveFlipped, toggleFlip } = useBoardFlip({ playerSide: playerColor });

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

  const handlePostmortem = () =>
    router.push(
      buildPostmortemPath({
        locale,
        formattedPgn,
        playerColor,
        moves: notationMoves,
        engineConfig,
        gameId,
        startingFen: startingFen ?? undefined,
      })
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InlineBoardView
            fen={displayFen ?? latestFen}
            playerSide={playerColor}
            flipped={effectiveFlipped}
            lastMove={lastMove}
            preferences={revealedPreferences}
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

      {/* Primary CTA — review this game (postmortem), mirroring the result
          screen. Members-only: guests get the sign-up prompt below. */}
      {notationMoves.length > 0 && (
        <Button
          variant="primary"
          size="lg"
          icon={<FaChartLine className="h-5 w-5" />}
          onClick={() => guardAction(handlePostmortem)}
          className="w-full rounded-xl font-medium"
        >
          {t('postmortem')}
        </Button>
      )}

      {/* Game details — same modal as the result screen (opponent shown;
          per-game settings / change log aren't persisted for shared games,
          which the modal notes as unavailable). */}
      <OperationLogModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        engineConfig={engineConfig}
      />

      {isAuthModalOpen && <AuthPromptModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />}
    </div>
  );
}
