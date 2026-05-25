'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiSend } from 'react-icons/fi';

import type { ChunkStatus } from '@/lib/chunks/validation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { publishChunk } from '../_actions/publishChunk';
import { localizeChunkError } from '../_lib/localize-error';

const PUBLISH_ERROR_CODES = new Set([
  'signInRequired',
  'unauthorized',
  'notFound',
  'alreadyDeleted',
  'descriptionRequired',
]);

type Props = {
  chunkId: string;
  /**
   * Used to build the "open the edit page" link from the
   * `needsDescription` guard modal so the owner can fix the gap in
   * one click instead of hunting for the edit affordance themselves.
   */
  chunkSlug: string;
  status: ChunkStatus;
  /**
   * Whether the chunk currently carries a non-empty description.
   * Publishing requires one (the application-level rule mirrors the
   * server-side guard in `publishChunkEntry`); the button stays
   * clickable in this state but opens the `needsDescription` guard
   * modal instead of the publish confirmation so the owner sees
   * *why* publish is blocked and how to fix it.
   */
  hasDescription: boolean;
};

/**
 * Owner-side Publish button on the chunk detail page.
 *
 * Styled as a subtle inline link to match the Edit / Fork affordances
 * on `/practice/puzzle/[id]` and `/practice/position-memory/[id]` —
 * the chunk detail page's bottom metadata row mirrors those surfaces.
 *
 * Renders only when the chunk is still in draft. Publish is a one-way
 * transition; the only way out of `published` afterwards is soft
 * delete (`ChunkDeleteButton`). Disabled when the chunk has no
 * description yet — `descriptionRequired` from the server fires the
 * same intent if a stale client somehow bypasses the disable.
 */
export function ChunkLifecycleControls({ chunkId, chunkSlug, status, hasDescription }: Props) {
  const t = useTranslations('chunks');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // 'publish'         — owner confirmed the chunk is ready; runs publishChunk
  // 'needsDescription' — owner clicked while description is empty; the modal
  //                      explains the gate and offers a one-click jump to edit
  const [modal, setModal] = useState<null | 'publish' | 'needsDescription'>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'draft') return null;

  async function handleConfirm() {
    setModal(null);
    setPending(true);
    setError(null);
    const result = await publishChunk(chunkId);
    setPending(false);

    if ('error' in result) {
      setError(localizeChunkError(result.error, t, PUBLISH_ERROR_CODES, 'form.errors'));
      return;
    }
    router.refresh();
  }

  function handleGoToEdit() {
    setModal(null);
    router.push(`/chunks/${chunkSlug}/edit` as '/chunks/[slug]/edit');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModal(hasDescription ? 'publish' : 'needsDescription')}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:border-foreground/20 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-muted-foreground transition-colors"
      >
        <FiSend className="h-3 w-3" aria-hidden />
        {pending ? t('actions.publishPending') : t('actions.publish')}
      </button>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ConfirmationModal
        isOpen={modal === 'publish'}
        title={t('actions.publishConfirmTitle')}
        message={t('actions.publishConfirmMessage')}
        confirmText={t('actions.publishConfirmCta')}
        cancelText={t('actions.publishConfirmCancel')}
        confirmVariant="primary"
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
      />

      <ConfirmationModal
        isOpen={modal === 'needsDescription'}
        title={t('actions.publishNeedsDescriptionTitle')}
        message={t('actions.publishNeedsDescriptionMessage')}
        confirmText={t('actions.publishNeedsDescriptionCta')}
        cancelText={t('actions.publishConfirmCancel')}
        confirmVariant="primary"
        onConfirm={handleGoToEdit}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
