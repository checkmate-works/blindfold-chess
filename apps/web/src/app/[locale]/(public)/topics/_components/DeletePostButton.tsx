'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { ActionResult } from '@/lib/action-types';

import { ConfirmActionButton } from '@/app/[locale]/_components/ConfirmActionButton';

type DeletePostAction = (postId: string, locale: string) => Promise<ActionResult>;

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
  const t = useTranslations(i18nNamespace);
  const router = useRouter();

  return (
    <ConfirmActionButton
      trigger={
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
        >
          {t('button')}
        </button>
      }
      title={t('confirmTitle')}
      message={t('confirmMessage')}
      confirmLabel={t('confirm')}
      pendingLabel={t('deleting')}
      cancelLabel={t('cancel')}
      confirmVariant="danger"
      onConfirm={async () => {
        const result = await deletePostAction(postId, locale);
        if ('error' in result) {
          return result;
        }
      }}
      onSuccess={() => router.push(redirectPath)}
    />
  );
}
