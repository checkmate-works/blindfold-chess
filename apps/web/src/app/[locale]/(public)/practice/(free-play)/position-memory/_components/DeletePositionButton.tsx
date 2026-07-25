'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { FiTrash2 } from 'react-icons/fi';

import { ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deletePosition } from '../_actions/deletePosition';

type Props = {
  positionId: string;
  locale: string;
};

/**
 * Owner-side delete entry for the position-memory detail page's "⋯" overflow
 * menu (`ActionsMenu`), matching the chunk delete affordance. On failure the
 * confirmation modal stays open and shows the error — inline text next to the
 * trigger would be invisible inside the closed popup.
 */
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
      <ActionsMenuButton tone="danger" onClick={() => setIsOpen(true)} disabled={isPending}>
        <FiTrash2 className="h-4 w-4" aria-hidden />
        {t('button')}
      </ActionsMenuButton>

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
