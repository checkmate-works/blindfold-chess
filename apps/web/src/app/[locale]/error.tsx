'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import { Button } from '@/app/_components';
import * as Sentry from '@sentry/nextjs';

/**
 * Root error boundary for the `[locale]` layout.
 *
 * This component intentionally avoids `useTranslations` and other hooks that
 * depend on `NextIntlClientProvider`. During HMR triggered by `.env.local`
 * changes the server restarts and the intl provider context may temporarily be
 * unavailable; if this error page itself relies on that context it will throw
 * again and the user sees an unrecoverable blank screen.
 *
 * A hardcoded translation map keyed by locale is used instead.
 */

const errorMessages = {
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    tryAgain: 'Try again',
    goHome: 'Go home',
  },
  ja: {
    title: '問題が発生しました',
    description: '予期しないエラーが発生しました。もう一度お試しください。',
    tryAgain: 'もう一度試す',
    goHome: 'ホームへ',
  },
} as const;

export default function Error({
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
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] -my-8">
      <div className="text-center max-w-md px-4">
        <h1 className="text-3xl font-bold text-foreground mb-4">{t.title}</h1>
        <p className="text-muted-foreground mb-8">{t.description}</p>
        <div className="flex gap-4 justify-center">
          <Button variant="primary" onClick={reset}>
            {t.tryAgain}
          </Button>
          <Link href={`/${locale}`}>
            <Button asChild variant="outline">
              {t.goHome}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
