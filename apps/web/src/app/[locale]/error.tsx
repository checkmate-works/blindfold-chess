'use client';

import { useEffect } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations('error');

  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] -my-8">
      <div className="text-center max-w-md px-4">
        <h1 className="text-3xl font-bold text-foreground mb-4">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">{t('description')}</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="primary" size="sm">
            {t('tryAgain')}
          </Button>
          <Link
            href="/"
            locale={locale}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors inline-block"
          >
            {t('goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
