'use client';

import { useContext, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { IntlAvailableContext } from './IntlAvailableContext';

type TranslationFn = ReturnType<typeof useTranslations>;

/**
 * A translation function that simply returns the key path as-is.
 * Used as a fallback when `NextIntlClientProvider` context is unavailable
 * (e.g. during HMR / env reload with Turbopack).
 */
function createFallbackT(namespace?: string): TranslationFn {
  const fn = (key: string) => {
    const path = namespace ? `${namespace}.${key}` : key;
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[next-intl] Fallback translation for "${path}" (provider not available)`);
    }
    return path;
  };
  // Mimic the minimal subset of the `t` function API that components use.
  fn.rich = fn as unknown as TranslationFn['rich'];
  fn.markup = fn as unknown as TranslationFn['markup'];
  fn.raw = fn as unknown as TranslationFn['raw'];
  fn.has = (_key: string) => false;
  return fn as unknown as TranslationFn;
}

/**
 * Drop-in replacement for `useTranslations` that gracefully degrades when
 * `NextIntlClientProvider` is temporarily unavailable.
 *
 * During HMR triggered by `.env.local` changes, Next.js (Turbopack) performs a
 * full reload. In the brief window where client components render before the
 * provider tree is re-established, the standard `useTranslations` throws
 * because the intl context is `undefined`. This wrapper detects that situation
 * via {@link IntlAvailableContext} and returns a cached fallback function that
 * echoes the translation key, preventing the throw and the Next.js dev overlay
 * error.
 *
 * **Hook ordering**: This hook conditionally calls `useTranslations`. This is
 * safe because `IntlAvailableContext` is provided by a component that is a
 * direct child of `NextIntlClientProvider`. When the provider unmounts/remounts
 * during HMR, the entire subtree (including the component calling this hook)
 * is re-mounted as a fresh instance, so the hook call count is consistent
 * within each component lifecycle.
 *
 * In production the provider is always present, so this adds negligible
 * overhead (one extra `useContext` call plus one `useRef`).
 */
export function useSafeTranslations(namespace?: string): TranslationFn {
  const isAvailable = useContext(IntlAvailableContext);
  const fallbackRef = useRef<TranslationFn | null>(null);

  if (!isAvailable) {
    if (!fallbackRef.current) {
      fallbackRef.current = createFallbackT(namespace);
    }
    return fallbackRef.current;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useTranslations(namespace);
}
