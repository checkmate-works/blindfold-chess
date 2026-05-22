'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiSend } from 'react-icons/fi';

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
   * the button renders disabled with a tooltip hint instead of letting
   * the user submit and bounce off the server.
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
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={disabled}
        title={!hasDescription ? t('actions.publishDescriptionRequired') : undefined}
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
