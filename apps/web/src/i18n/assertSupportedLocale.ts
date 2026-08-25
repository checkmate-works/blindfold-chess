import type { Locale } from '@/app/[locale]/_lib/types';

import { isSupportedLocale } from './supported-locale';

/**
 * Asserts that the given string is one of the app's `SUPPORTED_LOCALES`.
 *
 * Intended for Server Actions and Route Handlers that accept `locale: string`
 * from a client component and then embed it in `revalidatePath`, `redirect`,
 * or an external URL (e.g. Stripe `success_url`). Without this check an
 * attacker-controlled string would flow unvalidated into cache-tag derivation
 * and URL construction — the blast radius is narrow (cache invalidation of a
 * non-existent path is a no-op), but validating is cheap and removes the
 * entire class of "what if `locale` is `'../admin'`?" questions.
 *
 * The check itself is `isSupportedLocale()` from `./supported-locale`, the
 * one place that compares against `SUPPORTED_LOCALES`. We deliberately do NOT
 * go through `next-intl`'s `hasLocale(routing.locales, …)` helper here:
 * `routing.ts` transitively imports `next-intl/navigation` →
 * `next/navigation`, which breaks this module's usability from non-React /
 * test contexts.
 *
 * Throws rather than returning a boolean because every caller wants to fail
 * fast on an invalid locale; the throw is caught by the existing
 * `handleServerActionError` surface if the caller wraps its body in
 * try/catch, and otherwise surfaces as a Server Action error the client
 * reports generically.
 */
export function assertSupportedLocale(locale: string): asserts locale is Locale {
  if (!isSupportedLocale(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
}
