'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link, useRouter } from '@/i18n/routing';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { FaEye } from 'react-icons/fa';

import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { PuzzleBoardPeekModal } from './PuzzleBoardPeekModal';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  solutions: string[];
  positionId: string;
  fen: string;
};

const AUTO_NAVIGATE_DELAY_MS = 1000;

export function PuzzleAnswerForm({ solutions, positionId, fen }: Props) {
  const t = useTranslations('practice.puzzle.detail');
  const tPlay = useTranslations('play');
  const tResult = useTranslations('practice.puzzle.result');
  const router = useRouter();
  const { preferences, updatePreferences } = useGamePreferences();

  const [moveInput, setMoveInput] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [peekCount, setPeekCount] = useState(0);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const isSolved = result === 'correct';
  const hasErrors = attempts.some((a) => !a.isCorrect);
  const playerColor: 'w' | 'b' = isBlackToMoveFromFen(fen) ? 'b' : 'w';

  /**
   * MoveInputPanel calls this with the user's submitted move. Return `true`
   * on correct answer (matches the first move of any known solution line) and
   * `false` on incorrect answer, so MoveInputPanel can track invalid-attempt
   * counts. The legal-moves hint is suppressed via
   * `showLegalMovesHint={false}` below — revealing all legal moves on a
   * puzzle would be effectively giving the answer away.
   */
  function handleSubmit(move: AlgebraicNotation): boolean {
    const trimmed = move.trim();
    if (!trimmed) return false;

    // Initial implementation supports single-move puzzles only.
    // For multi-move puzzles, only the first move is checked.
    // Full multi-move interaction will be added in a future phase.
    const isCorrect = solutions.some((s) => {
      const firstMove = s.split(' ')[0];
      return firstMove === trimmed;
    });

    const newAttempt: Attempt = { move: trimmed, isCorrect };
    const updatedAttempts = [...attempts, newAttempt];
    setAttempts(updatedAttempts);
    setResult(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      // Find the matching solution line
      const solutionLine = solutions.find((s) => s.split(' ')[0] === trimmed) ?? solutions[0];

      // Save to sessionStorage for result page
      try {
        sessionStorage.setItem(
          `puzzle_result_${positionId}`,
          JSON.stringify({ attempts: updatedAttempts, solutionLine, fen, peekCount })
        );
      } catch {
        // sessionStorage may be unavailable
      }

      // Auto-navigate after a short delay
      setTimeout(() => {
        router.push(`/practice/puzzle/${positionId}/result`);
      }, AUTO_NAVIGATE_DELAY_MS);

      // Clear the text-mode input buffer only on success. On an incorrect
      // attempt we intentionally keep the buffer so the user can see what
      // they typed and edit it — clearing it would force them to retype the
      // whole move from scratch.
      setMoveInput('');
    }

    return isCorrect;
  }

  return (
    <div className="space-y-4">
      <MoveInputPanel
        preferences={preferences}
        updatePreferences={updatePreferences}
        currentFen={fen}
        moveInput={moveInput}
        onMoveInputChange={setMoveInput}
        error={result === 'incorrect' ? t('incorrect') : null}
        onErrorClear={() => {
          if (result === 'incorrect') setResult(null);
        }}
        onSubmit={handleSubmit}
        disabled={isSolved}
        inputPlaceholder={tPlay('inputMove')}
        selectPlaceholder={tPlay('selectMove')}
        toggleTitle={tPlay('switchInputMode')}
        playerColor={playerColor}
        showLegalMovesHint={false}
      />

      {result === 'correct' && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('correct')}</p>
      )}

      {hasErrors && (
        <Link
          href={`/practice/puzzle/${positionId}/result`}
          onClick={() => {
            // Save current attempts to sessionStorage even if not yet solved
            try {
              const solutionLine = solutions[0] ?? '';
              sessionStorage.setItem(
                `puzzle_result_${positionId}`,
                JSON.stringify({ attempts, solutionLine, fen, peekCount })
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
        fen={fen}
      />
    </div>
  );
}
