'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiSend } from 'react-icons/fi';

import type { ChunkStatus } from '@/lib/chunks/validation';
import { localizeActionError } from '@/lib/i18n/localize-action-error';

import { ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { publishChunk } from '../_actions/publishChunk';

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
 * Owner-side Publish entry for the chunk detail page's "⋯" overflow menu
 * (`ActionsMenu`).
 *
 * Renders only when the chunk is still in draft. Publish is a one-way
 * transition; the only way out of `published` afterwards is soft
 * delete (`ChunkDeleteButton`). Disabled when the chunk has no
 * description yet — `descriptionRequired` from the server fires the
 * same intent if a stale client somehow bypasses the disable.
 *
 * On failure the publish confirmation modal stays open and shows the
 * error — inline text next to the trigger would be invisible inside the
 * closed popup.
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
    setPending(true);
    setError(null);
    const result = await publishChunk(chunkId);
    setPending(false);

    if ('error' in result) {
      setError(localizeActionError(result.error, t, PUBLISH_ERROR_CODES, 'form.errors'));
      return;
    }
    setModal(null);
    router.refresh();
  }

  function handleGoToEdit() {
    setModal(null);
    router.push(`/chunks/${chunkSlug}/edit` as '/chunks/[slug]/edit');
  }

  return (
    <>
      <ActionsMenuButton
        onClick={() => setModal(hasDescription ? 'publish' : 'needsDescription')}
        disabled={pending}
      >
        <FiSend className="h-4 w-4" aria-hidden />
        {pending ? t('actions.publishPending') : t('actions.publish')}
      </ActionsMenuButton>

      <ConfirmationModal
        isOpen={modal === 'publish'}
        title={t('actions.publishConfirmTitle')}
        message={t('actions.publishConfirmMessage')}
        error={error}
        confirmText={t('actions.publishConfirmCta')}
        cancelText={t('actions.publishConfirmCancel')}
        confirmVariant="primary"
        isLoading={pending}
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
