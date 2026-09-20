import { SUPPORTED_LOCALES } from "@blindfold-chess/types";
import type { Locale } from "@blindfold-chess/types";

/**
 * The three ways either app is allowed to ask "is this string one of our
 * locales?".
 *
 * They are genuinely different questions, so they stay three functions
 * rather than one with flags — but they all read `SUPPORTED_LOCALES` and
 * nothing else, so adding a locale still means editing only that list.
 *
 * The web app had already collapsed five hand-rolled copies of these into
 * one module after they drifted: some compared case-sensitively, some did
 * not, and only one applied the primary-subtag fallback. The drift is
 * invisible until two of them disagree about the same visitor, which is
 * exactly how a Brazilian browser could be served `pt-BR` on one route and
 * `en` on the next. The mobile app then grew its own sixth copy, so the
 * rules now live here where both platforms read them.
 */

/**
 * Exact match in canonical casing — the check for values that are supposed
 * to already BE one of our identifiers: a cookie or `?lang=` param the app
 * set itself, a `locale` argument a client passed back to the server.
 *
 * Deliberately case-sensitive. These values originate from our own UI, so a
 * mis-cased one is a corrupted value rather than a stylistic variant, and
 * quietly normalizing it would let a stale or forged cookie decide the
 * language.
 */
export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Exact match ignoring case, returning the canonical identifier.
 *
 * For tags that come from outside the app and may carry any casing. RFC
 * 4647 explicitly allows the subtags in `Accept-Language` to vary in case,
 * and browsers do send `pt-br`; our canonical identifiers use BCP 47 mixed
 * case (`pt-BR`). Without this, a Brazilian browser would fall through to
 * English despite our shipping a Portuguese translation.
 *
 * Does NOT fall back to the primary subtag — use {@link matchLanguageTag}
 * for that. The distinction matters for URL segments: `/pt/x` is not a
 * route the web app serves, so it must not be mistaken for an
 * already-localized path.
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
 * instead of failing over to the default. It is what makes the supported
 * list the only table to maintain — there is no secondary BCP 47 variant
 * map to keep in sync. It is also what makes `pt-BR` reachable at all on
 * mobile: a device set to Portuguese reports `languageCode: "pt"`, which is
 * not itself a supported locale, so an exact-only check handed Brazilian
 * users English even though `pt-BR` ships in the bundle.
 *
 * If two supported locales ever share a primary subtag (e.g. `pt-BR` and
 * `pt-PT`), the prefix step resolves to whichever is declared first in
 * `SUPPORTED_LOCALES`. At that point the step should be replaced with
 * explicit regional preference ordering.
 */
export function matchLanguageTag(tag: string): Locale | undefined {
  const exact = findSupportedLocale(tag);
  if (exact) return exact;

  const primary = tag.toLowerCase().split("-")[0];
  if (!primary) return undefined;

  return SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase().split("-")[0] === primary,
  );
}
