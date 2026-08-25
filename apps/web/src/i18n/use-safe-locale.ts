'use client';

import { useContext } from 'react';

import { useLocale } from 'next-intl';

import { DEFAULT_LOCALE } from '@/config';

import { IntlAvailableContext } from './IntlAvailableContext';
import { findSupportedLocale } from './supported-locale';

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
      // Extract the locale from the pathname, e.g. /ja/... → 'ja'. Matching
      // against SUPPORTED_LOCALES rather than a shape: the two-letter regex
      // this used to run silently dropped `pt-BR`, because the character
      // after the two letters is `-` and not `/`, so every Brazilian page
      // fell back to English for the duration of the HMR window.
      const segment = window.location.pathname.split('/')[1] ?? '';
      const locale = findSupportedLocale(segment);
      if (locale) {
        if (process.env.NODE_ENV === 'development') {
          console.debug(
            `[next-intl] Fallback locale "${locale}" from pathname (provider not available)`
          );
        }
        return locale;
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[next-intl] Fallback locale "${DEFAULT_LOCALE}" (provider not available)`);
    }
    return DEFAULT_LOCALE;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLocale();
}
