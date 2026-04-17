'use client';

import { type FormEvent, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/i18n/routing';

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
          JSON.stringify({ attempts: updatedAttempts, solutionLine, fen })
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

      <button
        type="submit"
        disabled={isSolved || !userInput.trim()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('submitAnswer')}
      </button>

      {result === 'correct' && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">{t('correct')}</p>
      )}
      {result === 'incorrect' && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('incorrect')}</p>
      )}

      {isSolved && hasErrors && (
        <Link
          href={`/practice/puzzle/${positionId}/result`}
          className="inline-block rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90 transition-opacity"
        >
          {tResult('viewResult')}
        </Link>
      )}
    </form>
  );
}
