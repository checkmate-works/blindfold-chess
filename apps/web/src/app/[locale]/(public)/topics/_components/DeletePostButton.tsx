'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

type DeletePostAction = (
  postId: string,
  locale: string
) => Promise<{ success: true } | { error: string }>;

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
      router.push(redirectPath);
    }
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

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('confirmTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('confirmMessage')}</p>

            {error && <p className="text-destructive text-sm mb-4">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
                disabled={isPending}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded bg-destructive text-destructive-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? t('deleting') : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
