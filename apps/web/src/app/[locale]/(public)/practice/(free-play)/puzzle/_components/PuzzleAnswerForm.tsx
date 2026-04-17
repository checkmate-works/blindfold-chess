'use client';

import { type FormEvent, useState } from 'react';

import { useTranslations } from 'next-intl';

type Props = {
  solutions: string[];
};

export function PuzzleAnswerForm({ solutions }: Props) {
  const t = useTranslations('practice.puzzle.detail');
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const isSolved = result === 'correct';

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

    setResult(isCorrect ? 'correct' : 'incorrect');
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
    </form>
  );
}
