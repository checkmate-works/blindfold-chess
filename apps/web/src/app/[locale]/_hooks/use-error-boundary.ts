'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

/**
 * Copy for an error boundary, keyed by locale.
 *
 * Hardcoded rather than read through `useTranslations`, on purpose: an error
 * boundary must render when the tree below it could not. During HMR triggered
 * by `.env.local` changes the server restarts and `NextIntlClientProvider`'s
 * context is briefly unavailable — a boundary that depends on it throws again
 * and the user is left with an unrecoverable blank screen. Two locales' worth
 * of four strings is the price of the boundary being unable to fail that way.
 */
const ERROR_MESSAGES = {
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

type ErrorBoundaryLocale = keyof typeof ERROR_MESSAGES;

/**
 * The locale, copy, and error reporting every error boundary in the `[locale]`
 * tree needs — the parts that are the same whatever the boundary renders.
 *
 * The locale comes off the pathname because, again, the intl context may not be
 * there to ask. `pathname` is empty during SSR, which resolves to the default
 * locale until hydration replaces it.
 *
 * `logPrefix` labels the development console line for boundaries deep enough
 * that "which page threw this" is not obvious from the error alone.
 */
export function useErrorBoundary(
  error: Error & { digest?: string },
  logPrefix?: string
): { locale: ErrorBoundaryLocale; t: (typeof ERROR_MESSAGES)[ErrorBoundaryLocale] } {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const locale: ErrorBoundaryLocale = pathname.startsWith('/ja') ? 'ja' : 'en';

  useEffect(() => {
    Sentry.captureException(error);
    if (process.env.NODE_ENV === 'development') {
      if (logPrefix) console.error(logPrefix, error);
      else console.error(error);
    }
  }, [error, logPrefix]);

  return { locale, t: ERROR_MESSAGES[locale] };
}
