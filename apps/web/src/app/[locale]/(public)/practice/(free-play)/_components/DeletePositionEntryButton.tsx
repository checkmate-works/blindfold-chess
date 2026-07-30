'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { FiTrash2 } from 'react-icons/fi';

import type { ActionResult } from '@/lib/action-types';

import { ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

type Props = {
  /** i18n namespace holding this entry type's delete copy. */
  namespace: 'practice.positionMemory.delete' | 'practice.puzzle.delete';
  /** Deletes the entry. Both position `deleteX` actions return ActionResult. */
  onDelete: () => Promise<ActionResult>;
  /** Where to land once the entry is gone (the type's index, with a toast). */
  redirectPath: string;
};

/**
 * Owner-side delete entry for a position entry's detail page "⋯" overflow menu
 * (`ActionsMenu`), matching the chunk delete affordance. Shared by the
 * position-memory and puzzle detail pages, which differ only in their action,
 * their copy and where they return to.
 *
 * On failure the confirmation modal stays open and shows the error — inline
 * text next to the trigger would be invisible inside the closed popup.
 */
export function DeletePositionEntryButton({ namespace, onDelete, redirectPath }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations(namespace);
  const router = useRouter();

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await onDelete();

    if ('error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      router.push(redirectPath);
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
