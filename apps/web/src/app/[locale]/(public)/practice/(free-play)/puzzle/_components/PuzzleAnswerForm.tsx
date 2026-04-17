'use client';

import { type FormEvent, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link, useRouter } from '@/i18n/routing';
import { FaEye } from 'react-icons/fa';

import { PuzzleBoardPeekModal } from './PuzzleBoardPeekModal';

type Attempt = { move: string; isCorrect: boolean };

type Props = {
  solutions: string[];
  positionId: string;
  fen: string;
};

export function PuzzleAnswerForm({ solutions, positionId, fen }: Props) {
  const t = useTranslations('practice.puzzle.detail');
  const tResult = useTranslations('practice.puzzle.result');
  const router = useRouter();
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [peekCount, setPeekCount] = useState(0);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const isSolved = result === 'correct';
  const hasErrors = attempts.some((a) => !a.isCorrect);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = userInput.trim();
    if (!trimmed) return;

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
      }, 1000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="puzzle-answer" className="block text-sm font-medium text-foreground">
          {t('answerLabel')}
        </label>
        <input
          id="puzzle-answer"
          type="text"
          value={userInput}
          onChange={(e) => {
            setUserInput(e.target.value);
            if (result === 'incorrect') setResult(null);
          }}
          placeholder={t('answerPlaceholder')}
          disabled={isSolved}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      <Button type="submit" variant="primary" fullWidth disabled={isSolved || !userInput.trim()}>
        {t('submitAnswer')}
      </Button>

      {result === 'correct' && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('correct')}</p>
      )}
      {result === 'incorrect' && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('incorrect')}</p>
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
    </form>
  );
}
