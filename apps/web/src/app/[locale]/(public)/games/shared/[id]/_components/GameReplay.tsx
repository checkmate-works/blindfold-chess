'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { fenToLichessUrl, getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { GameCommentItem } from '@/lib/db/game-comments';
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
import { getMovingSide, parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { computeMoveNumber } from '@/app/[locale]/(public)/games/play/postmortem/_lib/compute-move-number';
import { GameStatsOverview } from '@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { type CommentUser, GameCommentThread } from './GameCommentThread';

type Props = {
  /** Published game id, used to anchor the per-move comment threads. */
  gameId: string;
  moves: string[];
  startingFen: string | null;
  playerColor: 'white' | 'black';
  engineConfig: EngineConfig;
  operationLogs: MoveOperationLog[] | null;
  locale: Locale;
  /** Advice comments on this game, anchored per move (ply). */
  comments: GameCommentItem[];
  /** The viewer, if signed in — enables posting and delete-own. */
  currentUser: CommentUser | null;
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
  comments,
  currentUser,
  children,
}: Props) {
  const router = useRouter();
  const { preferences } = useGamePreferences();
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  // Open at the first move (not the final position) so the viewer reviews and
  // comments move by move from the start. Runs once after the moves load.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || notationMoves.length === 0) return;
    startedRef.current = true;
    navigateToPosition(0);
  }, [notationMoves.length, navigateToPosition]);

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
          <GameCommentThread
            gameId={gameId}
            currentPly={currentPly}
            moveLabel={moveLabel}
            comments={comments}
            currentUser={currentUser}
            locale={locale}
          />
        )
      )}

      {/* Game details — same modal as the result screen (opponent shown;
          per-game settings / change log aren't persisted for shared games,
          which the modal notes as unavailable). */}
      <OperationLogModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        engineConfig={engineConfig}
      />
    </div>
  );
}
