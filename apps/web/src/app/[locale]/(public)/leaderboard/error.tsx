'use client';

import { useEffect } from 'react';

import { useTranslations } from 'next-intl';

import * as Sentry from '@sentry/nextjs';

import { PagePanel } from '@/app/[locale]/_components';

export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    Sentry.captureException(error);
    if (process.env.NODE_ENV === 'development') {
      console.error('[Leaderboard]', error);
    }
  }, [error]);

  return (
    <PagePanel>
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('title')}</h2>
        <p className="text-muted-foreground mb-6">{t('description')}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {t('tryAgain')}
        </button>
      </div>
    </PagePanel>
  );
}
