import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * The three ways this app is allowed to ask "is this string one of our
 * locales?", in one module.
 *
 * They existed as five hand-rolled copies scattered across the request path
 * (`lib/locale.ts`, `assertSupportedLocale.ts`, `getLandingLocale.ts`,
 * `locale-path.ts`, plus the `Accept-Language` parsers) and had already
 * drifted: some compared case-sensitively, some did not, and only one applied
 * the primary-subtag fallback. The drift is invisible until two of them
 * disagree about the same visitor, which is exactly how a Brazilian browser
 * could be served `pt-BR` on one route and `en` on the next.
 *
 * The three are genuinely different questions, so they stay three functions
 * rather than one with flags — but they all read `SUPPORTED_LOCALES` and
 * nothing else, so adding a locale still means editing only `@/config`.
 */

/**
 * Exact match in canonical casing — the check for values that are supposed to
 * already BE one of our identifiers: the `NEXT_LOCALE` cookie we set
 * ourselves, a `?lang=` param, a `locale` argument a client component passed
 * to a Server Action.
 *
 * Deliberately case-sensitive. These values originate from our own UI, so a
 * mis-cased one is a corrupted value rather than a stylistic variant, and
 * quietly normalizing it would let a stale or forged cookie decide the
 * language. `lib/locale.test.ts` pins this boundary.
 */
export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Exact match ignoring case, returning the canonical identifier.
 *
 * For tags that come from outside the app and may carry any casing. RFC 4647
 * explicitly allows the subtags in `Accept-Language` to vary in case, and
 * browsers do send `pt-br`; our canonical identifiers use BCP 47 mixed case
 * (`pt-BR`). Without this, a Brazilian browser would fall through to English
 * despite our shipping a Portuguese translation.
 *
 * Does NOT fall back to the primary subtag — use {@link matchLanguageTag} for
 * that. The distinction matters for URL segments: `/pt/x` is not a route we
 * serve, so it must not be mistaken for an already-localized path.
 */
export function findSupportedLocale(tag: string): Locale | undefined {
  const lower = tag.toLowerCase();
  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lower);
}

/**
 * Full language-tag match: exact (ignoring case) first, then the primary
 * subtag against the primary subtag of each supported locale.
 *
 * The prefix step maps a bare `pt` (generic Portuguese preference) onto our
 * only regional variant, `pt-BR`, and resolves `en-GB` / `en-AU` to `en`
 * instead of failing over to the default. It is what makes the supported list
 * the only table to maintain — there is no secondary BCP 47 variant map to
 * keep in sync.
 *
 * If two supported locales ever share a primary subtag (e.g. `pt-BR` and
 * `pt-PT`), the prefix step resolves to whichever is declared first in
 * `SUPPORTED_LOCALES`. At that point the step should be replaced with
 * explicit regional preference ordering.
 */
export function matchLanguageTag(tag: string): Locale | undefined {
  const exact = findSupportedLocale(tag);
  if (exact) return exact;

  const primary = tag.toLowerCase().split('-')[0];
  if (!primary) return undefined;

  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().split('-')[0] === primary);
}
