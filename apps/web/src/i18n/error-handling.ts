import type { IntlError } from 'next-intl';
import { IntlErrorCode } from 'next-intl';

/**
 * Shared error/fallback handlers for next-intl.
 *
 * Used by both server-side (`i18n/request.ts`) and client-side (`providers.tsx`).
 * This module intentionally avoids server-only APIs so it can be imported from
 * `'use client'` files.
 */

export function handleIntlError(error: IntlError): void {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    // Missing translations are expected during HMR / dev server restarts
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[next-intl] ${error.message}`);
    }
  } else {
    console.error('[next-intl]', error);
  }
}

export function getMessageFallback({
  namespace,
  key,
  error,
}: {
  namespace?: string;
  key: string;
  error: IntlError;
}): string {
  const path = [namespace, key].filter(Boolean).join('.');
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    return path;
  }
  return `[Translation error: ${path}]`;
}
