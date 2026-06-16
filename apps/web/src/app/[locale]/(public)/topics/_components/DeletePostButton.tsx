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
  /**
   * When `true`, a successful delete stays on the current page and only
   * `router.refresh()`es — it does NOT navigate to `redirectPath`.
   *
   * Comment / reply deletes set this. `redirectPath` is the topic LISTING
   * page (the right destination when the thread *root* is deleted, since
   * the post-detail page is meaningless without its OP). But a reply lives
   * *on* that detail page — navigating away on a reply delete yanks the
   * reader off the page and makes every other comment appear to vanish at
   * once. Staying put + refreshing drops just the deleted reply and leaves
   * the rest of the thread visible. The OP-delete path (OpCard) leaves this
   * `false` so removing the root still returns to the listing.
   */
  stayOnPage?: boolean;
};

export function DeletePostButton({
  postId,
  locale,
  redirectPath,
  deletePostAction,
  i18nNamespace,
  stayOnPage = false,
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
      if (stayOnPage) {
        // Reply / comment delete: stay on the current page. `deletePost`
        // already revalidated the path server-side; `router.refresh()`
        // re-fetches so the deleted comment drops out while the rest of
        // the thread stays put. No `router.push` — navigating to the
        // listing here would make every other comment appear to vanish.
        router.refresh();
      } else {
        // OP / root-post delete: the detail page is meaningless once the
        // root is gone, so navigate to `redirectPath` (the listing), then
        // refresh to bust the cache. `router.push` to the same URL does
        // not re-fetch on its own, which is why the refresh follows.
        router.push(redirectPath);
        router.refresh();
      }
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
