'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deletePosition } from '../_actions/deletePosition';

type Props = {
  positionId: string;
  locale: string;
};

export function DeletePositionButton({ positionId, locale }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('practice.positionMemory.delete');
  const router = useRouter();

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deletePosition(positionId, locale);

    if ('error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      router.push(`/${locale}/practice/position-memory?toast=position_deleted`);
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
        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
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
