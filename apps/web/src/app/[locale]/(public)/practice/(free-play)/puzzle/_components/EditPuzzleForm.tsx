'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { getTurnFromFen, isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core';
import { flushSync } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

import { PositionDetailBoard } from '@/app/[locale]/(public)/practice/(free-play)/position-memory/_components/single-position/PositionDetailBoard';

import { updatePuzzle } from '../_actions/updatePuzzle';
import { CircleMarker } from './CircleMarker';

type Props = {
  positionId: string;
  initial: {
    title: string;
    description: string | null;
    fen: string;
    solutionMoves: string[];
  };
};

export function EditPuzzleForm({ positionId, initial }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.edit');
  const tCreate = useTranslations('practice.puzzle.create');
  const tUnsaved = useTranslations('unsavedChanges');

  const initialDescription = initial.description ?? '';
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isDirty = !submitted && (title !== initial.title || description !== initialDescription);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  const flipped = isBlackToMoveFromFen(initial.fen);
  let firstTurn: 'w' | 'b' = 'w';
  try {
    firstTurn = (getTurnFromFen(initial.fen) as 'w' | 'b') ?? 'w';
  } catch {
    firstTurn = 'w';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await updatePuzzle({
        id: positionId,
        title,
        description: description || null,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      flushSync(() => setSubmitted(true));
      router.push(`/practice/puzzle/${positionId}?toast=puzzle_updated`);
    } catch {
      setError(t('saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            {tCreate('titleLabel')} <span className="text-destructive">*</span>
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
            {tCreate('descriptionLabel')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded border border-border bg-card text-foreground"
          />
        </div>

        <div
          role="note"
          className="flex items-start gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
        >
          <FiInfo className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
          <span>{t('fenLockedHint')}</span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t('lockedPositionLabel')}</p>
          <div className="flex justify-center">
            <div className="w-full max-w-md opacity-90">
              <PositionDetailBoard fen={initial.fen} flipped={flipped} />
            </div>
          </div>
        </div>

        {initial.solutionMoves.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('lockedSolutionLabel')}</p>
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              {initial.solutionMoves.map((move, index) => {
                const isWhiteMove = index % 2 === (firstTurn === 'w' ? 0 : 1);
                return (
                  <li key={index} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <CircleMarker color={isWhiteMove ? 'w' : 'b'} />
                    <span className="font-mono text-foreground">{move}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={pending || title.trim() === '' || !isDirty}
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </>
  );
}
