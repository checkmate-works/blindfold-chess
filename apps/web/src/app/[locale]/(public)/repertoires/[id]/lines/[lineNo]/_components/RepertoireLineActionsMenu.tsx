'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteLine } from '../_actions/deleteLine';

type Props = {
  repertoireId: string;
  lineNo: number;
  locale: string;
};

/**
 * Owner-only "⋯" menu on a line detail page: edit link + delete with a
 * confirmation modal, mirroring the repertoire-level {@link RepertoireActionsMenu}.
 * Deleting a line is the per-line replacement for pruning it out of the
 * (removed) whole-kata editor; on success we return to the kata detail page,
 * since the line's own URL no longer resolves. On failure the modal stays open
 * and shows the error.
 */
export function RepertoireLineActionsMenu({ repertoireId, lineNo, locale }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await deleteLine({ repertoireId, lineNo });
    if (!result.ok) {
      setPending(false);
      setError(t('errors.generic'));
      return;
    }
    setPending(false);
    setOpen(false);
    router.push(`/repertoires/${repertoireId}`);
  }

  return (
    <>
      <ActionsMenu
        ariaLabel={t('detail.moreActions')}
        items={[
          {
            key: 'edit',
            label: t('line.edit.editAction'),
            href: `/${locale}/repertoires/${repertoireId}/lines/${lineNo}/edit`,
            icon: <FiEdit2 className="h-4 w-4" aria-hidden />,
          },
        ]}
      >
        <ActionsMenuButton tone="danger" onClick={() => setOpen(true)} disabled={pending}>
          <FiTrash2 className="h-4 w-4" aria-hidden />
          {t('line.delete.button')}
        </ActionsMenuButton>
      </ActionsMenu>
      <ConfirmationModal
        isOpen={open}
        title={t('line.delete.title')}
        message={t('line.delete.message')}
        error={error}
        confirmText={t('line.delete.confirm')}
        cancelText={t('line.delete.cancel')}
        confirmVariant="danger"
        isLoading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
