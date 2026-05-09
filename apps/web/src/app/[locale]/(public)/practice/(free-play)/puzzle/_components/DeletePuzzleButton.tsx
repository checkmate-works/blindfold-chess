'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deletePuzzle } from '../_actions/deletePuzzle';

type Props = {
  puzzleId: string;
  locale: string;
};

export function DeletePuzzleButton({ puzzleId, locale }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('practice.puzzle.delete');
  const router = useRouter();

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deletePuzzle(puzzleId, locale);

    if ('error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      router.push(`/${locale}/practice/puzzle?toast=puzzle_deleted`);
    }
  }

  function handleCancel() {
    setIsOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        {t('button')}
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title={t('confirmTitle')}
        message={t('confirmMessage')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleDelete}
        onCancel={handleCancel}
      />
    </>
  );
}
