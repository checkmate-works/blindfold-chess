'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteChunk } from '../_actions/deleteChunk';

type Props = {
  chunkId: string;
};

/**
 * Owner-side soft-delete affordance for a chunk, surfaced on the
 * detail page. Lives outside `ChunkLifecycleControls` because that
 * component is hidden on published chunks (its sole action,
 * `publishChunkEntry`, only applies to drafts) — but the owner still
 * needs a way to take down a published chunk if it turns out to be
 * wrong or abusive, and the edit page is also 404 in that state.
 *
 * Calls the existing `deleteChunk` Server Action (same one the edit
 * form uses) and redirects to the catalog on success.
 */
export function ChunkDeleteButton({ chunkId }: Props) {
  const t = useTranslations('chunks');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);

    const result = await deleteChunk(chunkId);
    setPending(false);

    if ('error' in result) {
      const wellKnown = new Set(['signInRequired', 'unauthorized', 'notFound', 'alreadyDeleted']);
      setError(
        wellKnown.has(result.error)
          ? t(`form.errors.${result.error}` as 'form.errors.signInRequired')
          : result.error
      );
      return;
    }
    router.push('/chunks');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="px-3 py-1.5 text-sm rounded border border-destructive text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
      >
        {pending ? t('form.actions.deleting') : t('form.actions.delete')}
      </button>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t('form.delete.confirmTitle')}
        message={t('form.delete.confirmBody')}
        confirmText={t('form.delete.confirm')}
        cancelText={t('form.delete.cancel')}
        confirmVariant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
