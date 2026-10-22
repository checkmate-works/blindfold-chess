'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiTrash2 } from 'react-icons/fi';

import type { ActionResult } from '@/lib/action-types';

import { ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useConfirmAction } from '@/app/[locale]/_hooks/use-confirm-action';

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
  const t = useTranslations(namespace);
  const router = useRouter();
  const { isOpen, open, cancel, isPending, error, setError, run } = useConfirmAction();

  function handleDelete() {
    return run(
      onDelete,
      (result) => ('error' in result ? result.error : null),
      () => router.push(redirectPath)
    );
  }

  function handleCancel() {
    cancel();
    setError(null);
  }

  return (
    <>
      <ActionsMenuButton tone="danger" onClick={open} disabled={isPending}>
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
