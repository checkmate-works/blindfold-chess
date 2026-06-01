'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { fenToLichessUrl, getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { EngineConfig } from '@/lib/engines';
import type { MoveOperationLog } from '@/lib/games/saved-game-types';

import { InlineBoardView } from '@/app/[locale]/(public)/games/play/_components/InlineBoardView';
import { MovesPanel } from '@/app/[locale]/(public)/games/play/_components/MovesPanel';
import {
  useBoardFlip,
  useMoveNavigation,
  useNotation,
} from '@/app/[locale]/(public)/games/play/_hooks';
import { buildNewGameFromPositionUrl } from '@/app/[locale]/(public)/games/play/_lib/build-new-game-from-position-url';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  moves: string[];
  startingFen: string | null;
  playerColor: 'white' | 'black';
  engineConfig: EngineConfig;
  operationLogs: MoveOperationLog[] | null;
  locale: string;
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
  moves,
  startingFen,
  playerColor,
  engineConfig,
  operationLogs,
  locale,
}: Props) {
  const router = useRouter();
  const { preferences } = useGamePreferences();

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

  return (
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
  );
}
