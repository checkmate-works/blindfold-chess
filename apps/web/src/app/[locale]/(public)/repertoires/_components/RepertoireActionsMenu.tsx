'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteRepertoire } from '../_actions/deleteRepertoire';

type Props = {
  id: string;
  locale: string;
};

/**
 * Owner-only "⋯" menu on the repertoire detail page: edit link + delete with
 * a confirmation modal. Rendered only for owners (the page checks `isOwner`
 * server-side). On failure the modal stays open and shows the error.
 */
export function RepertoireActionsMenu({ id, locale }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await deleteRepertoire({ id });
    if ('error' in result) {
      setPending(false);
      setError(t('errors.generic'));
      return;
    }
    setPending(false);
    setOpen(false);
    router.push('/repertoires');
  }

  return (
    <>
      <ActionsMenu
        ariaLabel={t('detail.moreActions')}
        items={[
          {
            key: 'edit',
            label: t('edit.editAction'),
            href: `/${locale}/repertoires/${id}/edit`,
            icon: <FiEdit2 className="h-4 w-4" aria-hidden />,
          },
        ]}
      >
        <ActionsMenuButton tone="danger" onClick={() => setOpen(true)} disabled={pending}>
          <FiTrash2 className="h-4 w-4" aria-hidden />
          {t('delete.button')}
        </ActionsMenuButton>
      </ActionsMenu>
      <ConfirmationModal
        isOpen={open}
        title={t('delete.title')}
        message={t('delete.message')}
        error={error}
        confirmText={t('delete.confirm')}
        cancelText={t('delete.cancel')}
        confirmVariant="danger"
        isLoading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
