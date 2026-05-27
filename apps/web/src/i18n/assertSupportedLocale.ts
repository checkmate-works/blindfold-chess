import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

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
 * The allowlist is read directly from `SUPPORTED_LOCALES` — the single source
 * of truth defined in `@/config`. We deliberately do NOT go through
 * `next-intl`'s `hasLocale(routing.locales, …)` helper here: `routing.ts`
 * transitively imports `next-intl/navigation` → `next/navigation`, which
 * breaks this module's usability from non-React / test contexts.
 * `SUPPORTED_LOCALES` is a `readonly string[]`, so `.includes()` with a
 * narrowing cast is both type-safe at the call site (see the
 * `asserts locale is Locale` signature) and trivially tree-shakable.
 *
 * Throws rather than returning a boolean because every caller wants to fail
 * fast on an invalid locale; the throw is caught by the existing
 * `handleServerActionError` surface if the caller wraps its body in
 * try/catch, and otherwise surfaces as a Server Action error the client
 * reports generically.
 */
export function assertSupportedLocale(locale: string): asserts locale is Locale {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
}
