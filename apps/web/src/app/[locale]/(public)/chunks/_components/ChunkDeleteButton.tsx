'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiTrash2 } from 'react-icons/fi';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteChunk } from '../_actions/deleteChunk';

type Props = {
  chunkId: string;
};

/**
 * Owner-side soft-delete affordance for a chunk, surfaced as a subtle
 * inline link in the detail page's bottom metadata row — same styling
 * as the Edit / Fork affordances on `/practice/puzzle/[id]` so chunks
 * stay visually consistent with the other UGC surfaces.
 *
 * Lives outside `ChunkLifecycleControls` because that component is
 * hidden on published chunks (its sole action only applies to drafts).
 * The owner still needs a way to take down a published chunk if it
 * turns out to be wrong or abusive, and the edit page is also 404 in
 * that state, so this control is always available to the owner.
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
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50 transition-colors"
      >
        <FiTrash2 className="h-3 w-3" aria-hidden />
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
