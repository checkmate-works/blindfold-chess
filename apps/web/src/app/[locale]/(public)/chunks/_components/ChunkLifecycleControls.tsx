'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';

import type { ChunkStatus } from '@/lib/chunks/validation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { publishChunk } from '../_actions/publishChunk';

type Props = {
  chunkId: string;
  status: ChunkStatus;
  /**
   * Whether the chunk currently carries a non-empty description.
   * Publishing requires one (the application-level rule mirrors the
   * server-side guard in `publishChunkEntry`), so when this is false
   * the button renders disabled with an inline hint instead of letting
   * the user submit and bounce off the server.
   */
  hasDescription: boolean;
};

/**
 * Owner-visible Publish button on the chunk detail page.
 *
 * Renders only when the chunk is still in draft. Publish is a one-way
 * transition — once published the row is locked at the application
 * layer and there is no "Unpublish" path back. The button is also
 * disabled when the chunk has no description yet (a published chunk
 * must carry both a title and a description; the server enforces this
 * via `descriptionRequired`, and this UI gives the same hint up front).
 */
export function ChunkLifecycleControls({ chunkId, status, hasDescription }: Props) {
  const t = useTranslations('chunks');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'draft') return null;

  async function handleConfirm() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);
    const result = await publishChunk(chunkId);
    setPending(false);

    if ('error' in result) {
      const wellKnown = new Set([
        'signInRequired',
        'unauthorized',
        'notFound',
        'alreadyDeleted',
        'descriptionRequired',
      ]);
      setError(
        wellKnown.has(result.error)
          ? t(`form.errors.${result.error}` as 'form.errors.signInRequired')
          : result.error
      );
      return;
    }
    router.refresh();
  }

  const disabled = pending || !hasDescription;

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={disabled}
          title={!hasDescription ? t('actions.publishDescriptionRequired') : undefined}
          className="px-3 py-1.5 text-sm rounded border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? t('actions.publishPending') : t('actions.publish')}
        </button>
        {!hasDescription && (
          <p className="text-xs text-muted-foreground">{t('actions.publishDescriptionRequired')}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t('actions.publishConfirmTitle')}
        message={t('actions.publishConfirmMessage')}
        confirmText={t('actions.publishConfirmCta')}
        cancelText={t('actions.publishConfirmCancel')}
        confirmVariant="primary"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
