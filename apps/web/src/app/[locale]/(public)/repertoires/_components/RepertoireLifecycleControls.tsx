'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiSend } from 'react-icons/fi';

import type { Repertoire } from '@/lib/db';

import { ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { publishRepertoire } from '../[id]/_actions/publishRepertoire';

type Props = {
  id: string;
  locale: string;
  status: Repertoire['status'];
  /**
   * Live line count — publishing needs at least one. The entry stays
   * clickable at zero and opens the `needsLine` guard modal instead of the
   * publish confirmation, so the owner sees *why* publish is blocked and
   * gets one click to the line editor.
   */
  lineCount: number;
};

/**
 * Owner-side Publish entry for the repertoire detail page's "⋯" overflow menu
 * (`ActionsMenu`), mirroring `ChunkLifecycleControls`.
 *
 * Renders only while the kata is `building`. Publish is one-way — see
 * `publishRepertoireEntry`; afterwards the owner can only narrow visibility
 * (`RepertoireVisibilityControl`). This used to be a full-width warning banner
 * above the board, which spent a lot of vertical space on a state the
 * "in progress" chip already reports; the menu is where every other owner
 * action on this page (and on chunks) already lives.
 *
 * On failure the confirmation modal stays open and shows the error — inline
 * text next to the trigger would be invisible inside the closed popup.
 */
export function RepertoireLifecycleControls({ id, locale, status, lineCount }: Props) {
  const t = useTranslations('Repertoires.publish');
  const tToast = useTranslations('toast');
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [modal, setModal] = useState<null | 'publish' | 'needsLine'>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'building') return null;

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await publishRepertoire({ id, locale });
    setPending(false);
    if ('error' in result) {
      setError(t('errors.generic'));
      return;
    }
    setModal(null);
    // This path never navigates, so it can't use the `?toast=` receipt the
    // edit form gets — without a toast the only feedback is the draft badge
    // vanishing, which is easy to miss. Fired directly instead.
    showToast(tToast('repertoirePublished'), 'success');
    router.refresh();
  }

  function handleGoToNewLine() {
    setModal(null);
    router.push(`/repertoires/${id}/lines/new`);
  }

  return (
    <>
      <ActionsMenuButton
        onClick={() => setModal(lineCount >= 1 ? 'publish' : 'needsLine')}
        disabled={pending}
      >
        <FiSend className="h-4 w-4" aria-hidden />
        {pending ? t('pending') : t('button')}
      </ActionsMenuButton>

      <ConfirmationModal
        isOpen={modal === 'publish'}
        title={t('confirmTitle')}
        message={t('confirmMessage')}
        error={error}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        confirmVariant="primary"
        isLoading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
      />

      <ConfirmationModal
        isOpen={modal === 'needsLine'}
        title={t('needsLineTitle')}
        message={t('needsLineMessage')}
        confirmText={t('needsLineCta')}
        cancelText={t('cancel')}
        confirmVariant="primary"
        onConfirm={handleGoToNewLine}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
