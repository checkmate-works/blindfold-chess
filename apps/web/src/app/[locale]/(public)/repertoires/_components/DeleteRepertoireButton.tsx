'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/routing';
import { FiTrash2 } from 'react-icons/fi';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
      >
        <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
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
