'use client';

import { useEffect } from 'react';

import { Button } from '@/app/_components';
import * as Sentry from '@sentry/nextjs';

import { PagePanel } from '@/app/[locale]/_components/PagePanel';

/**
 * Leaderboard error boundary.
 *
 * Avoids `useTranslations` so this page remains functional even when the
 * `NextIntlClientProvider` context is temporarily unavailable (e.g. during
 * HMR after `.env.local` changes).
 *
 * A hardcoded translation map keyed by locale is used instead.
 */

const errorMessages = {
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    tryAgain: 'Try again',
  },
  ja: {
    title: '問題が発生しました',
    description: '予期しないエラーが発生しました。もう一度お試しください。',
    tryAgain: 'もう一度試す',
  },
} as const;

export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const locale = pathname.startsWith('/ja') ? 'ja' : 'en';
  const t = errorMessages[locale];

  useEffect(() => {
    Sentry.captureException(error);
    if (process.env.NODE_ENV === 'development') {
      console.error('[Leaderboard]', error);
    }
  }, [error]);

  return (
    <PagePanel>
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t.title}</h2>
        <p className="text-muted-foreground mb-6">{t.description}</p>
        <Button variant="primary" onClick={reset}>
          {t.tryAgain}
        </Button>
      </div>
    </PagePanel>
  );
}
