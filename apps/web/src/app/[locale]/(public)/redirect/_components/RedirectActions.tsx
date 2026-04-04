'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  url: string;
  locale: string;
};

export function RedirectActions({ url, locale }: Props) {
  const t = useTranslations('redirect');
  const router = useRouter();

  return (
    <div className="flex gap-3">
      <a
        href={url}
        rel="nofollow ugc noopener noreferrer"
        className="inline-flex items-center justify-center rounded-md bg-foreground px-6 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
      >
        {t('continue')}
      </a>
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push(`/${locale}`);
          }
        }}
        className="inline-flex items-center justify-center rounded-md border border-border px-6 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
      >
        {t('goBack')}
      </button>
    </div>
  );
}
