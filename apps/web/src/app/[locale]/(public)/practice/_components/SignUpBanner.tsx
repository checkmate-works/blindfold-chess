'use client';

import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function SignUpBanner({ locale }: Props) {
  const { user, isLoading } = useAuth();
  const t = useTranslations('practice.signUpBanner');

  if (isLoading || user) return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div>
          <p className="font-medium text-foreground">{t('message')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Link
          href="/sign-up"
          locale={locale}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('cta')}
        </Link>
      </div>
    </div>
  );
}
