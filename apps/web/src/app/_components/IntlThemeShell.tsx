'use client';

import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import { getMessageFallback, handleIntlError } from '@/i18n/error-handling';

import { ThemeProvider } from '@/lib/theme/ThemeProvider';

type Props = {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
};

/**
 * The outermost client providers every route tree needs: the recovering error
 * boundary, next-intl wired to this app's error handling, the flag that tells
 * `useSafeTranslations` a provider is present, and the theme.
 *
 * The app has two root layouts — the landing page at `/` and the localized
 * tree under `/[locale]` — and each had spelled this stack out. The inner
 * providers legitimately differ (the landing page has no auth or navigation
 * guard; the localized tree has no landing-specific toast plumbing), but the
 * shell does not, and the intl configuration in particular is a decision
 * rather than boilerplate: `onError` and `getMessageFallback` are what keep a
 * missing translation from throwing in production, and having them in two
 * places meant one root could quietly lose them.
 *
 * `timeZone="UTC"` is fixed so server and client format dates identically —
 * a locale-derived zone would hydrate differently for a traveller.
 */
export function IntlThemeShell({ children, locale, messages }: Props) {
  return (
    <ErrorBoundary autoRecover>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
        onError={handleIntlError}
        getMessageFallback={getMessageFallback}
      >
        <IntlAvailableContext.Provider value={true}>
          <ThemeProvider disableTransitionOnChange>{children}</ThemeProvider>
        </IntlAvailableContext.Provider>
      </NextIntlClientProvider>
    </ErrorBoundary>
  );
}
