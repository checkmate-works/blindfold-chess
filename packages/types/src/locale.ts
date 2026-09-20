/**
 * Supported locales — the single source of truth for every locale-derived
 * artifact in the product.
 *
 * Everything else is computed from this array: on web, URL segments
 * (`/[locale]/...`), hreflang entries, the `<html lang>` attribute,
 * canonical URLs, sitemap alternates, OG `og:locale` values, and message
 * file paths (`src/messages/<locale>.json`); on mobile, device-language
 * negotiation and the i18next resource keys. Adding or removing a locale
 * here fans out to all of those surfaces. The one additional touchpoint is
 * adding the key to the exhaustive `Record<Locale, _>` maps (e.g.
 * `LOCALE_LABELS`, `OG_LOCALE_MAP`), which TypeScript enforces at compile
 * time.
 *
 * The list lives in the shared package rather than in either app because
 * both apps negotiate the same set against the same rules (see
 * `@blindfold-chess/features/locale`). Two copies of the list is two
 * chances for a device reporting `pt` to reach Portuguese on one platform
 * and English on the other — which is what the two copies this replaced
 * were one edit away from at any time.
 *
 * @design Locale identifier policy
 *
 * Bare ISO 639-1 codes (`en`, `es`, `ja`) when a single language variant is
 * sufficient; BCP 47 / RFC 5646 region-qualified codes (`pt-BR`) when
 * regional variants materially differ and we need to target a specific one.
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
 */
export const SUPPORTED_LOCALES = ["en", "es", "pt-BR", "ja"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
