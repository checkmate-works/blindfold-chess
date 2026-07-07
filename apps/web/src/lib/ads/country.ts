/** Name of the dev-only cookie that forces a geo for local ad-targeting tests. */
export const DEV_COUNTRY_COOKIE = 'bfc_dev_country';

/**
 * Dev-only geo override, read from the `bfc_dev_country` cookie.
 *
 * Vercel's `x-vercel-ip-country` header never exists locally, so country
 * targeting is otherwise untestable off-platform. Setting this cookie (e.g.
 * `document.cookie = 'bfc_dev_country=JP; path=/'` in the browser console, or
 * `-H 'cookie: bfc_dev_country=JP'` via curl) makes both the SSR feed path and
 * the `/api/ad-slot/[slot]` fetch resolve to that country, because both read
 * from the same request `Headers`. Compiled out in production: the cookie is
 * never consulted when `NODE_ENV === 'production'`, so the live geo path is
 * byte-for-byte unchanged.
 */
function devCountryOverride(headers: Headers): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  const cookie = headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)bfc_dev_country=([^;]+)/);
  if (!match) return null;
  const code = decodeURIComponent(match[1]).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * Geo lookup for ad targeting, isolated behind one function.
 *
 * The platform-specific detail (Vercel's `x-vercel-ip-country` request
 * header) lives only here — mirroring the chess.js / getRequestCountry
 * isolation principle. If the deploy platform changes, this is the single
 * site to update. Returns an uppercase ISO-3166 alpha-2 code, or null when
 * the header is absent (local dev, non-Vercel, or geo unavailable).
 *
 * In non-production only, a `bfc_dev_country` cookie can stand in for the
 * missing Vercel header so country targeting is testable locally — see
 * {@link devCountryOverride}.
 */
export function getRequestCountry(headers: Headers): string | null {
  const raw = headers.get('x-vercel-ip-country');
  if (raw) {
    const code = raw.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) return code;
  }
  return devCountryOverride(headers);
}

/**
 * Whether a creative may show to a visitor in `country`, given its
 * `target_country`.
 *
 * - null target → global, shows everywhere.
 * - a code → shows only if the visitor's country is known AND equal. When the
 *   country is unknown (null), a *targeted* creative is withheld (fail closed —
 *   never show a JP-only ad to an unknown geo), while global creatives still
 *   show.
 */
export function creativeAllowedInCountry(
  targetCountry: string | null | undefined,
  country: string | null
): boolean {
  if (!targetCountry) return true;
  if (!country) return false;
  return targetCountry === country;
}

export function filterByCountry<T extends { targetCountry: string | null }>(
  creatives: readonly T[],
  country: string | null
): T[] {
  return creatives.filter((c) => creativeAllowedInCountry(c.targetCountry, country));
}
