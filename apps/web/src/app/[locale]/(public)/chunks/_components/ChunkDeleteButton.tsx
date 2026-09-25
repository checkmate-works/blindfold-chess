'use client';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiTrash2 } from 'react-icons/fi';

import { localizeActionError } from '@/lib/i18n/localize-action-error';

import { ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useConfirmAction } from '@/app/[locale]/_hooks/use-confirm-action';

import { deleteChunk } from '../_actions/deleteChunk';

const DELETE_ERROR_CODES = new Set([
  'signInRequired',
  'unauthorized',
  'notFound',
  'alreadyDeleted',
]);

type Props = {
  chunkId: string;
};

/**
 * Owner-side soft-delete entry for the chunk detail page's "⋯" overflow
 * menu (`ActionsMenu`).
 *
 * Lives outside `ChunkLifecycleControls` because that component is
 * hidden on published chunks (its sole action only applies to drafts).
 * The owner still needs a way to take down a published chunk if it
 * turns out to be wrong or abusive, and the edit page is also 404 in
 * that state, so this control is always available to the owner.
 *
 * On failure the confirmation modal stays open and shows the error —
 * inline text next to the trigger would be invisible inside the closed
 * popup.
 */
export function ChunkDeleteButton({ chunkId }: Props) {
  const t = useTranslations('chunks');
  const router = useRouter();
  const { isOpen, open, cancel, isPending, error, run } = useConfirmAction();

  function handleConfirm() {
    return run(
      () => deleteChunk(chunkId),
      (result) =>
        'error' in result
          ? localizeActionError(result.error, t, DELETE_ERROR_CODES, 'form.errors')
          : null,
      () => router.push('/chunks')
    );
  }

  return (
    <>
      <ActionsMenuButton tone="danger" onClick={open} disabled={isPending}>
        <FiTrash2 className="h-4 w-4" aria-hidden />
        {isPending ? t('form.actions.deleting') : t('form.actions.delete')}
      </ActionsMenuButton>

      <ConfirmationModal
        isOpen={isOpen}
        title={t('form.delete.confirmTitle')}
        message={t('form.delete.confirmBody')}
        error={error}
        confirmText={t('form.delete.confirm')}
        cancelText={t('form.delete.cancel')}
        confirmVariant="danger"
        isLoading={isPending}
        onConfirm={handleConfirm}
        onCancel={cancel}
      />
    </>
  );
}
