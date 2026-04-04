'use client';

import { useContext } from 'react';

import { useLocale } from 'next-intl';

import { IntlAvailableContext } from './IntlAvailableContext';

/**
 * Drop-in replacement for `useLocale` that gracefully degrades when
 * `NextIntlClientProvider` is temporarily unavailable.
 *
 * During HMR triggered by `.env.local` changes, Next.js (Turbopack) performs a
 * full reload. In the brief window where client components render before the
 * provider tree is re-established, the standard `useLocale` throws because the
 * intl context is `undefined`. This wrapper detects that situation via
 * {@link IntlAvailableContext} and returns a fallback locale derived from
 * `window.location.pathname` (or `'en'` as default), preventing the throw and
 * the Next.js dev overlay error.
 *
 * **Hook ordering**: This hook conditionally calls `useLocale`. This is safe
 * because `IntlAvailableContext` is provided by a component that is a direct
 * child of `NextIntlClientProvider`. When the provider unmounts/remounts during
 * HMR, the entire subtree (including the component calling this hook) is
 * re-mounted as a fresh instance, so the hook call count is consistent within
 * each component lifecycle.
 *
 * In production the provider is always present, so this adds negligible
 * overhead (one extra `useContext` call).
 */
export function useSafeLocale(): string {
  const isAvailable = useContext(IntlAvailableContext);

  if (!isAvailable) {
    if (typeof window !== 'undefined') {
      // Attempt to extract locale from pathname, e.g. /ja/... → 'ja'
      const match = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      if (match) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(
            `[next-intl] Fallback locale "${match[1]}" from pathname (provider not available)`
          );
        }
        return match[1];
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[next-intl] Fallback locale "en" (provider not available)');
    }
    return 'en';
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLocale();
}
