'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteRepertoire } from '../_actions/deleteRepertoire';

type Props = {
  id: string;
  locale: string;
  /** Where to go after a successful delete: refresh the list, or leave the detail page. */
  afterDelete: 'refresh' | 'list';
};

export function DeleteRepertoireButton({ id, locale, afterDelete }: Props) {
  const t = useTranslations('Lines');
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
      router.push('/lines');
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-red-700 underline hover:opacity-80 dark:text-red-300"
      >
        {t('delete.button')}
      </button>
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
