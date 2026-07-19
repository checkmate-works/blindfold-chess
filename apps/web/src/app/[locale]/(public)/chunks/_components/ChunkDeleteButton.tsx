'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiTrash2 } from 'react-icons/fi';

import { PositionActionsMenuButton } from '@/app/[locale]/(public)/practice/(free-play)/_components/PositionActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteChunk } from '../_actions/deleteChunk';
import { localizeChunkError } from '../_lib/localize-error';

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
 * menu (`PositionActionsMenu`).
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
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const result = await deleteChunk(chunkId);
    setPending(false);

    if ('error' in result) {
      setError(localizeChunkError(result.error, t, DELETE_ERROR_CODES, 'form.errors'));
      return;
    }
    setConfirmOpen(false);
    router.push('/chunks');
  }

  return (
    <>
      <PositionActionsMenuButton
        tone="danger"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
      >
        <FiTrash2 className="h-4 w-4" aria-hidden />
        {pending ? t('form.actions.deleting') : t('form.actions.delete')}
      </PositionActionsMenuButton>

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t('form.delete.confirmTitle')}
        message={t('form.delete.confirmBody')}
        error={error}
        confirmText={t('form.delete.confirm')}
        cancelText={t('form.delete.cancel')}
        confirmVariant="danger"
        isLoading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
