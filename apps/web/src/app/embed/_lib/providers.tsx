'use client';

import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import { getMessageFallback, handleIntlError } from '@/i18n/error-handling';

type Props = {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
};

/**
 * The embed surface's provider tree: translations, and nothing else.
 *
 * `[locale]/_lib/providers.tsx` additionally mounts theme, auth, toast,
 * navigation-guard and query-string adapters — every one of which exists for
 * an app the visitor is *using*. This document is a widget inside someone
 * else's article: it has no session, no navigation, and nothing to warn about
 * leaving.
 *
 * `IntlAvailableContext` must be set here rather than left to the intl
 * provider alone: `useSafeTranslations` reads it to decide whether a provider
 * is mounted, and without it every string in the widget silently renders as
 * its own key path (`embed.flipBoard`), which no type or test catches.
 */
export function EmbedProviders({ children, locale, messages }: Props) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="UTC"
      onError={handleIntlError}
      getMessageFallback={getMessageFallback}
    >
      <IntlAvailableContext.Provider value={true}>{children}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}
