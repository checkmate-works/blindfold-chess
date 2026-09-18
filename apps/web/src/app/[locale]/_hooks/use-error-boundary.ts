'use client';

import { useEffect } from 'react';

import { DEFAULT_LOCALE } from '@/config';
import { findSupportedLocale } from '@/i18n/supported-locale';
import * as Sentry from '@sentry/nextjs';

import type { Locale } from '@/app/[locale]/_lib/types';

/** The four strings every error boundary in this app renders. */
type ErrorBoundaryCopy = {
  title: string;
  description: string;
  tryAgain: string;
  goHome: string;
};

/**
 * Copy for an error boundary, keyed by locale.
 *
 * Hardcoded rather than read through `useTranslations`, on purpose: an error
 * boundary must render when the tree below it could not. During HMR triggered
 * by `.env.local` changes the server restarts and `NextIntlClientProvider`'s
 * context is briefly unavailable — a boundary that depends on it throws again
 * and the user is left with an unrecoverable blank screen. Four locales' worth
 * of four strings is the price of the boundary being unable to fail that way.
 * Importing the same strings from `src/messages/<locale>.json` would dodge the
 * provider too, but a static import pulls a several-thousand-key message file
 * into whichever client chunk this hook lands in, for four strings.
 *
 * The wording tracks the `error` namespace of those message files, so a
 * translator changing one has the other's vocabulary to copy.
 *
 * `satisfies Record<Locale, …>` is what keeps the table complete: adding a
 * locale to `SUPPORTED_LOCALES` breaks this file at compile time instead of
 * silently serving that locale English, which is how `es` and `pt-BR` visitors
 * got an English error screen for as long as this table had two entries while
 * every other locale-derived surface in the app had four. `Locale` is a type
 * and erases at compile time, so the check adds no import to the bundle —
 * which matters here, because the runtime imports are exactly the ones that
 * cannot drag `next-intl` back in.
 */
const ERROR_MESSAGES = {
  en: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    tryAgain: 'Try again',
    goHome: 'Go home',
  },
  es: {
    title: 'Algo salió mal',
    description: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    tryAgain: 'Intentar de nuevo',
    goHome: 'Ir al inicio',
  },
  'pt-BR': {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro inesperado. Tente novamente.',
    tryAgain: 'Tentar novamente',
    goHome: 'Ir para o início',
  },
  ja: {
    title: '問題が発生しました',
    description: '予期しないエラーが発生しました。もう一度お試しください。',
    tryAgain: 'もう一度試す',
    goHome: 'ホームへ',
  },
} as const satisfies Record<Locale, ErrorBoundaryCopy>;

/**
 * The locale a boundary should render in, taken from the first segment of
 * `pathname`, falling back to the default locale.
 *
 * Matching goes through `findSupportedLocale`, the same `SUPPORTED_LOCALES`
 * lookup the rest of the locale plumbing uses, rather than a prefix test:
 * `startsWith('/ja')` also claims a hypothetical `/japanese-openings`, and
 * there is no prefix form that distinguishes `pt-BR` from a segment that
 * merely begins with it.
 *
 * `findSupportedLocale` compares case-insensitively and returns the canonical
 * identifier, which only matters for `pt-BR` — the one locale whose casing can
 * be written wrong. In practice the segment reaching a boundary is already
 * canonical: `[locale]/layout.tsx` declares `dynamicParams = false`, so
 * `/PT-BR/...` is a framework 404 that never renders this tree, and `proxy.ts`
 * deliberately leaves a mis-cased prefix alone rather than redirecting it.
 * Normalizing anyway costs one `toLowerCase()` and means the value handed to
 * `ERROR_MESSAGES` is a key it actually has.
 *
 * An empty `pathname` — what the hook sees during SSR — has no first segment
 * and resolves to the default locale.
 */
export function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split('/')[1] ?? '';
  return findSupportedLocale(segment) ?? DEFAULT_LOCALE;
}

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
): { locale: Locale; t: ErrorBoundaryCopy } {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const locale = localeFromPathname(pathname);

  useEffect(() => {
    Sentry.captureException(error);
    if (process.env.NODE_ENV === 'development') {
      if (logPrefix) console.error(logPrefix, error);
      else console.error(error);
    }
  }, [error, logPrefix]);

  return { locale, t: ERROR_MESSAGES[locale] };
}
