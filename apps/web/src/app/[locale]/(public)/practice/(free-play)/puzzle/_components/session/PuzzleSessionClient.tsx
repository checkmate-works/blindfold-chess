'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link, useRouter } from '@/i18n/routing';
import { executeMove, getPlayerMovesFromSequence } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaEye } from 'react-icons/fa';

import type { PuzzleSolutionMove } from '@/lib/db/schema/positions';

import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PuzzleBoardPeekModal } from './PuzzleBoardPeekModal';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  solutions: PuzzleSolutionMove[][];
  positionId: string;
  fen: string;
};

const AUTO_NAVIGATE_DELAY_MS = 1000;

type SessionState = {
  currentFen: string;
  playerMoves: string[];
  lockedSolutionIndex: number | null;
  attempts: Attempt[];
};

export function PuzzleSessionClient({ solutions, positionId, fen }: Props) {
  const t = useTranslations('practice.puzzle.session');
  const tPlay = useTranslations('play');
  const tResult = useTranslations('practice.puzzle.result');
  const router = useRouter();
  const { preferences, updatePreferences } = useGamePreferences();

  const playerColor: 'w' | 'b' = isBlackToMoveFromFen(fen) ? 'b' : 'w';

  // Pre-extract each solution's SAN tokens and its player-move slots so per-submit
  // matching is O(solutions * 1) rather than re-parsing on every keystroke.
  const parsedSolutions = useMemo(
    () =>
      solutions.map((line) => {
        const moves = line.map((m) => m.san) as AlgebraicNotation[];
        const playerSlots = getPlayerMovesFromSequence(moves, playerColor);
        return { moves, playerSlots };
      }),
    [solutions, playerColor]
  );

  const [session, setSession] = useState<SessionState>({
    currentFen: fen,
    playerMoves: [],
    lockedSolutionIndex: null,
    attempts: [],
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
    // Opponent moves live in the SAN slots interleaved with player slots.
    const playerStartIndex = playerColor === 'w' ? 0 : 1;
    const justPlayedSanIndex = playerStartIndex + (playerMoveCount - 1) * 2;
    const opponentSanIndex = justPlayedSanIndex + 1;

    let fenAfter = afterPlayer.fen;
    if (opponentSanIndex < solution.moves.length) {
      const opponentMove = solution.moves[opponentSanIndex]!;
      const afterOpponent = executeMove(fenAfter, opponentMove);
      if (afterOpponent) {
        fenAfter = afterOpponent.fen;
      }
    }

    const solved = playerMoveCount >= solution.playerSlots.length;
    setSession({
      currentFen: fenAfter,
      playerMoves: newPlayerMoves,
      lockedSolutionIndex: locked,
      attempts: updatedAttempts,
    });
    setMoveInput('');
    setError(null);

    if (solved) {
      setIsSolved(true);
      finishSolve(solutions[locked]!.map((m) => m.san).join(' '), updatedAttempts);
    }

    return true;
  }

  return (
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
  );
}
