'use client';

import { type ReactNode, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link, useRouter } from '@/i18n/routing';
import { executeMove } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaEye } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { Divider } from '@/app/[locale]/_components/Divider';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PuzzleBoardPeekModal } from './PuzzleBoardPeekModal';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  solutions: PuzzleSolutionMove[][];
  positionId: string;
  fen: string;
  positionTitle: string;
  /**
   * Breadcrumb rendered at the bottom of the page panel. Passed as a prop
   * from the server page so locale-aware `<Breadcrumb>` (a server component)
   * doesn't have to cross the client boundary. Mirrors the `games/play`
   * `PlayPageClient` shape where `breadcrumb` is injected the same way.
   */
  breadcrumb: ReactNode;
};

const AUTO_NAVIGATE_DELAY_MS = 1000;

type SessionState = {
  currentFen: string;
  playerMoves: string[];
  lockedSolutionIndex: number | null;
  attempts: Attempt[];
  /**
   * SAN of the opponent's most recent auto-played reply, or `null` before the
   * first player move. Surfaced in the UI as a `"White plays Nh2"` status
   * line so the user isn't left wondering how the position advanced between
   * their own moves. Mirrors the `aiPlayed` status pattern in `games/play`.
   */
  lastOpponentMove: string | null;
};

export function PuzzleSessionClient({
  solutions,
  positionId,
  fen,
  positionTitle,
  breadcrumb,
}: Props) {
  const t = useTranslations('practice.puzzle.session');
  const tPlay = useTranslations('play');
  const tResult = useTranslations('practice.puzzle.result');
  const router = useRouter();
  const { preferences, updatePreferences } = useGamePreferences();

  const playerColor: 'w' | 'b' = isBlackToMoveFromFen(fen) ? 'b' : 'w';

  // Pre-extract each solution's SAN tokens and its player-move slots so per-submit
  // matching is O(solutions * 1) rather than re-parsing on every keystroke.
  //
  // A puzzle's stored solution always starts with the player's move (that's
  // the whole point of a puzzle), so the player's moves sit at indices 0, 2,
  // 4, … and the opponent's replies at 1, 3, 5, … — regardless of which side
  // (white or black) the puzzle is set up for. We can't use
  // `getPlayerMovesFromSequence(moves, playerColor)` from chess-core here:
  // that helper is a PGN utility that assumes white always plays index 0, so
  // feeding it a black-to-move puzzle ("h5 Nh2 Bg3", playerColor='b') would
  // return `['Nh2']` and reject the correct first move `h5`.
  const parsedSolutions = useMemo(
    () =>
      solutions.map((line) => {
        const moves = line.map((m) => m.san) as AlgebraicNotation[];
        const playerSlots = moves.filter((_, i) => i % 2 === 0);
        return { moves, playerSlots };
      }),
    [solutions]
  );

  const [session, setSession] = useState<SessionState>({
    currentFen: fen,
    playerMoves: [],
    lockedSolutionIndex: null,
    attempts: [],
    lastOpponentMove: null,
  });
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [peekCount, setPeekCount] = useState(0);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  const hasErrors = session.attempts.some((a) => !a.isCorrect);

  function finishSolve(solutionLine: string, attempts: Attempt[]) {
    try {
      sessionStorage.setItem(
        `puzzle_result_${positionId}`,
        JSON.stringify({ attempts, solutionLine, fen, peekCount })
      );
    } catch {
      // sessionStorage may be unavailable
    }
    setTimeout(() => {
      router.push(`/practice/puzzle/${positionId}/result`);
    }, AUTO_NAVIGATE_DELAY_MS);
  }

  function handleSubmit(move: AlgebraicNotation): boolean {
    const trimmed = move.trim();
    if (!trimmed || isSolved) return false;

    const nextPlayerIndex = session.playerMoves.length;

    // Which solution lines accept this move at the current player slot? If we
    // have already locked to a line, restrict to it; otherwise scan all.
    const candidates =
      session.lockedSolutionIndex !== null
        ? [session.lockedSolutionIndex]
        : parsedSolutions.map((_, i) => i);

    const matchIdx = candidates.find(
      (i) => parsedSolutions[i]!.playerSlots[nextPlayerIndex] === trimmed
    );

    const attempt: Attempt = { move: trimmed, isCorrect: matchIdx !== undefined };
    const updatedAttempts = [...session.attempts, attempt];

    if (matchIdx === undefined) {
      setSession({ ...session, attempts: updatedAttempts });
      setError(t('incorrect'));
      return false;
    }

    // Accept the player move and advance FEN.
    const afterPlayer = executeMove(session.currentFen, trimmed);
    if (!afterPlayer) {
      // Should not happen — the solution line was pre-validated server-side.
      setSession({ ...session, attempts: updatedAttempts });
      setError(t('incorrect'));
      return false;
    }

    const locked = matchIdx;
    const solution = parsedSolutions[locked]!;
    const newPlayerMoves = [...session.playerMoves, trimmed];
    const playerMoveCount = newPlayerMoves.length;

    // Auto-play the opponent reply that follows this player move, if any.
    // Puzzle solutions always begin with the player's move, so the player's
    // N-th move (1-indexed) is at SAN index (N-1)*2 and the opponent's reply
    // at (N-1)*2 + 1. This is independent of `playerColor`.
    const justPlayedSanIndex = (playerMoveCount - 1) * 2;
    const opponentSanIndex = justPlayedSanIndex + 1;

    let fenAfter = afterPlayer.fen;
    let playedOpponentMove: string | null = null;
    if (opponentSanIndex < solution.moves.length) {
      const opponentMove = solution.moves[opponentSanIndex]!;
      const afterOpponent = executeMove(fenAfter, opponentMove);
      if (afterOpponent) {
        fenAfter = afterOpponent.fen;
        playedOpponentMove = opponentMove;
      }
    }

    const solved = playerMoveCount >= solution.playerSlots.length;
    setSession({
      currentFen: fenAfter,
      playerMoves: newPlayerMoves,
      lockedSolutionIndex: locked,
      attempts: updatedAttempts,
      lastOpponentMove: playedOpponentMove,
    });
    setMoveInput('');
    setError(null);

    if (solved) {
      setIsSolved(true);
      finishSolve(solutions[locked]!.map((m) => m.san).join(' '), updatedAttempts);
    }

    return true;
  }

  // Opponent status slot in the PageTitle — mirrors the `aiMoveDisplay`
  // pattern from `games/play/_components/PlayPageClient.tsx`, where the
  // PageTitle is a single-line status surface that switches between the
  // default page heading and transient "AI played X" announcements. Here
  // the PageTitle carries the puzzle's title by default and swaps to
  // "⚪ White plays Nh2" while the opponent reply is the freshest context.
  // When `isSolved` flips to true the "Correct!" confirmation below takes
  // focus, so we revert the title to the puzzle name instead of pinning
  // the last opponent move there.
  const opponentColor: 'w' | 'b' = playerColor === 'w' ? 'b' : 'w';
  const opponentStatusKey = opponentColor === 'w' ? 'whitePlayed' : 'blackPlayed';
  const showOpponentStatus = session.lastOpponentMove !== null && !isSolved;
  const titleContent = showOpponentStatus ? (
    <span data-testid="opponent-status">
      <span aria-hidden className="mr-1 text-base leading-none">
        {opponentColor === 'w' ? '⚪' : '⚫'}
      </span>
      {t(opponentStatusKey, { move: session.lastOpponentMove! })}
    </span>
  ) : (
    positionTitle
  );

  return (
    <div className="space-y-8">
      <PageTitle>{titleContent}</PageTitle>

      <PagePanel>
        <div className="space-y-4">
          <MoveInputPanel
            preferences={preferences}
            updatePreferences={updatePreferences}
            currentFen={session.currentFen}
            moveInput={moveInput}
            onMoveInputChange={setMoveInput}
            error={error}
            onErrorClear={() => setError(null)}
            onSubmit={handleSubmit}
            disabled={isSolved}
            inputPlaceholder={tPlay('inputMove')}
            selectPlaceholder={tPlay('selectMove')}
            toggleTitle={tPlay('switchInputMode')}
            playerColor={playerColor}
            showLegalMovesHint={false}
          />

          {isSolved && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('correct')}</p>
          )}

          {hasErrors && !isSolved && (
            <Link
              href={`/practice/puzzle/${positionId}/result`}
              onClick={() => {
                // Save current attempts to sessionStorage even if not yet solved.
                // First solution line is a safe default here because the user has
                // not locked onto any specific line yet (or has only guessed wrong).
                try {
                  const solutionLine = (solutions[0] ?? []).map((m) => m.san).join(' ');
                  sessionStorage.setItem(
                    `puzzle_result_${positionId}`,
                    JSON.stringify({
                      attempts: session.attempts,
                      solutionLine,
                      fen,
                      peekCount,
                    })
                  );
                } catch {
                  // sessionStorage may be unavailable
                }
              }}
            >
              <Button asChild variant="secondary" fullWidth>
                {tResult('viewResult')}
              </Button>
            </Link>
          )}

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              icon={<FaEye />}
              disabled={isSolved}
              onClick={() => {
                setPeekCount((c) => c + 1);
                setIsBoardVisible(true);
              }}
              title={t('showBoard')}
            >
              <span className="hidden md:inline">{t('showBoard')}</span>
            </Button>
          </div>

          <PuzzleBoardPeekModal
            isOpen={isBoardVisible}
            onClose={() => setIsBoardVisible(false)}
            fen={session.currentFen}
          />
        </div>

        <Divider />

        {breadcrumb}
      </PagePanel>
    </div>
  );
}
