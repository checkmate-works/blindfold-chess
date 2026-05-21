'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';

import type { ChunkStatus } from '@/lib/chunks/validation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { publishChunk } from '../_actions/publishChunk';
import { unpublishChunk } from '../_actions/unpublishChunk';

type Props = {
  chunkId: string;
  status: ChunkStatus;
};

/**
 * Owner-visible Publish / Unpublish button on the chunk detail page.
 *
 * Publishing is gated by a confirmation modal because it changes the
 * row's editability semantics (published chunks are locked against
 * owner edits at the application layer); un-publishing is also gated
 * since the row temporarily disappears from the canonical catalog
 * presentation and re-opens for editing.
 *
 * Both buttons call their dedicated Server Action and refresh the
 * route data via `router.refresh()` so the badge + Edit affordance
 * re-render against the new status without a full reload.
 */
export function ChunkLifecycleControls({ chunkId, status }: Props) {
  const t = useTranslations('chunks');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetAction = status === 'draft' ? 'publish' : 'unpublish';

  async function handleConfirm() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);
    const result =
      targetAction === 'publish' ? await publishChunk(chunkId) : await unpublishChunk(chunkId);
    setPending(false);

    if ('error' in result) {
      // Known error tokens are surfaced through the same i18n shape the
      // form uses; unknown tokens fall through verbatim to aid debugging.
      const wellKnown = new Set(['signInRequired', 'unauthorized', 'notFound', 'alreadyDeleted']);
      setError(
        wellKnown.has(result.error)
          ? t(`form.errors.${result.error}` as 'form.errors.signInRequired')
          : result.error
      );
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className={`px-3 py-1.5 text-sm rounded border transition-colors disabled:opacity-50 ${
          targetAction === 'publish'
            ? 'border-primary text-primary hover:bg-primary/10'
            : 'border-border text-foreground hover:bg-muted'
        }`}
      >
        {pending
          ? t(`actions.${targetAction}Pending` as 'actions.publishPending')
          : t(`actions.${targetAction}` as 'actions.publish')}
      </button>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t(`actions.${targetAction}ConfirmTitle` as 'actions.publishConfirmTitle')}
        message={t(`actions.${targetAction}ConfirmMessage` as 'actions.publishConfirmMessage')}
        confirmText={t(`actions.${targetAction}ConfirmCta` as 'actions.publishConfirmCta')}
        cancelText={t('actions.publishConfirmCancel')}
        confirmVariant={targetAction === 'publish' ? 'primary' : 'danger'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
