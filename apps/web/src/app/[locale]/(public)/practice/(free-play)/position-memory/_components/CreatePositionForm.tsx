'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { validateFen } from '@blindfold-chess/features/chess-core';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';

import { createPosition } from '../_actions/createPosition';

export function CreatePositionForm() {
  const router = useRouter();
  const t = useTranslations('practice.positionMemory.create');
  const [fen, setFen] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isFenValid = fen.trim() !== '' && validateFen(fen.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fen.trim()) {
      setError(t('fenRequired'));
      return;
    }

    if (!isFenValid) {
      setError(t('fenInvalid'));
      return;
    }

    if (!title.trim()) {
      setError(t('titleRequired'));
      return;
    }

    setPending(true);

    try {
      const result = await createPosition({
        fen,
        title,
        description: description || null,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      router.push(`/practice/position-memory/${result.id}`);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="fen" className="block text-sm font-medium mb-1">
          {t('fenLabel')} <span className="text-destructive">*</span>
        </label>
        <input
          id="fen"
          type="text"
          value={fen}
          onChange={(e) => setFen(e.target.value)}
          placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          required
        />
        {fen.trim() && !isFenValid && (
          <p className="text-sm text-destructive mt-1">{t('fenInvalid')}</p>
        )}
      </div>

      {isFenValid && (
        <div className="w-64">
          <AnimatedChessBoard
            initialFen={fen.trim()}
            showCoordinates={false}
            flipped={isBlackToMoveFromFen(fen.trim())}
          />
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          {t('titleLabel')} <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          {t('descriptionLabel')}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
