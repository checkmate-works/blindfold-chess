'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiTrash2 } from 'react-icons/fi';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { OwnerActionButton } from '@/app/[locale]/_components/OwnerActionChip';

import { deleteRepertoire } from '../_actions/deleteRepertoire';

type Props = {
  id: string;
  locale: string;
  /** Where to go after a successful delete: refresh the list, or leave the detail page. */
  afterDelete: 'refresh' | 'list';
};

export function DeleteRepertoireButton({ id, locale, afterDelete }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await deleteRepertoire({ id, locale });
    if ('error' in result) {
      setPending(false);
      setError(t('errors.generic'));
      return;
    }
    setPending(false);
    setOpen(false);
    if (afterDelete === 'list') {
      router.push('/repertoires');
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <OwnerActionButton tone="danger" onClick={() => setOpen(true)} disabled={pending}>
        <FiTrash2 aria-hidden />
        {t('delete.button')}
      </OwnerActionButton>
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
