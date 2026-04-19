export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blindfold-chess.online'
).replace(/\/$/, '');
export const SITE_DOMAIN = 'blindfold-chess.online';
export const AUTHOR_NAME = 'CheckmateWorks';
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const COOKIEYES_ID = process.env.NEXT_PUBLIC_COOKIEYES_ID;

export const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
export const ADSENSE_SLOT_CONTENT_MIDDLE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_MIDDLE;
export const ADSENSE_SLOT_CONTENT_BOTTOM = process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_BOTTOM;
export const ADSENSE_SLOT_INFEED_DESKTOP = process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED_DESKTOP;
export const ADSENSE_INFEED_LAYOUT_KEY_DESKTOP =
  process.env.NEXT_PUBLIC_ADSENSE_INFEED_LAYOUT_KEY_DESKTOP;
export const ADSENSE_SLOT_INFEED_MOBILE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED_MOBILE;
export const ADSENSE_INFEED_LAYOUT_KEY_MOBILE =
  process.env.NEXT_PUBLIC_ADSENSE_INFEED_LAYOUT_KEY_MOBILE;
export const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost');

/**
 * Supported locales — the single source of truth for every locale-derived
 * artifact in the app.
 *
 * Everything else is computed from this array: URL segments (`/[locale]/...`),
 * hreflang entries, the `<html lang>` attribute, canonical URLs, sitemap
 * alternates, OG `og:locale` values, and message file paths
 * (`src/messages/<locale>.json`). Adding or removing a locale here
 * automatically fans out to all of those surfaces — there is no second list
 * to update.
 *
 * Locale identifier policy: we use bare ISO 639-1 codes (`en`, `es`, `ja`)
 * when a single language variant is sufficient, and BCP 47 / RFC 5646
 * region-qualified codes (`pt-BR`) when regional variants materially differ
 * and we need to target a specific one.
 *
 * Why `pt-BR` specifically, and not `pt` or a split into `pt-BR` + `pt-PT`:
 * Brazilian Portuguese and European Portuguese differ significantly in
 * vocabulary, spelling, and idiom. Google treats bare `pt` as
 * country-agnostic and gives it weaker regional targeting than a qualified
 * code, so `pt-BR` ranks better for the Brazilian audience the translation
 * actually targets (~95% of Portuguese-speaking web users are in Brazil).
 * We do not split into `pt-BR` + `pt-PT` because we only have one
 * translation; shipping a duplicated or machine-translated `pt-PT` would
 * trigger Google "duplicate content" / "alternate page with wrong hreflang"
 * warnings — worse for SEO than shipping `pt-BR` alone. Portugal users are
 * served the `pt-BR` page, which Google considers an acceptable near-match.
 *
 * Future extension: adding `pt-PT` (or any other regional variant) later is
 * a single-line change to this array. Because all downstream artifacts
 * derive from this list, no other file needs to be updated for the new
 * locale to get URLs, hreflang, sitemap entries, `<html lang>`, OG locale
 * alternate signals, and message file resolution. The one additional
 * touchpoint is adding the locale key to the exhaustive `Record<Locale, _>`
 * maps (e.g. `LOCALE_LABELS`, `OG_LOCALE_MAP`), which TypeScript enforces at
 * compile time.
 */
export const SUPPORTED_LOCALES = ['en', 'es', 'pt-BR', 'ja'] as const;
export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// Keep in sync with Supabase Dashboard: Authentication > Settings > Password > "Minimum password length"
export const MIN_PASSWORD_LENGTH = 6;

export const MAX_GAMES = 20;

export const GAME_UPDATED_EVENT = 'blindfold-chess:game-updated';
export const NOTIFICATIONS_READ_EVENT = 'blindfold-chess:notifications-read';

export function notifyGameListUpdated() {
  window.dispatchEvent(new CustomEvent(GAME_UPDATED_EVENT));
}

export function notifyNotificationsRead() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
}
