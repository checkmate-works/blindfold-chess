'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import type { DeletePostAction } from '../_lib/action-types';

type Props = {
  postId: string;
  locale: string;
  redirectPath: string;
  deletePostAction: DeletePostAction;
  i18nNamespace: string;
};

export function DeletePostButton({
  postId,
  locale,
  redirectPath,
  deletePostAction,
  i18nNamespace,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations(i18nNamespace);
  const router = useRouter();

  async function handleDelete() {
    setIsPending(true);
    setError(null);

    const result = await deletePostAction(postId, locale);

    if ('error' in result) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      // `deletePost` soft-deletes and revalidates the topic detail path
      // server-side, but on surfaces that list comments inline,
      // `redirectPath` IS the current page — `router.push` to the same
      // URL does not re-fetch, so the deleted comment lingers until a
      // manual reload. `router.refresh()` forces the re-fetch; on the
      // post-detail surface (where `redirectPath` differs) the push still
      // navigates away as before.
      router.push(redirectPath);
      router.refresh();
    }
  }

  function handleCancel() {
    setIsOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        {t('button')}
      </button>

      <ConfirmationModal
        isOpen={isOpen}
        title={t('confirmTitle')}
        message={t('confirmMessage')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={handleDelete}
        onCancel={handleCancel}
      />
    </>
  );
}
