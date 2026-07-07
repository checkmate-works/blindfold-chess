/**
 * Geo lookup for ad targeting, isolated behind one function.
 *
 * The platform-specific detail (Vercel's `x-vercel-ip-country` request
 * header) lives only here — mirroring the chess.js / getRequestCountry
 * isolation principle. If the deploy platform changes, this is the single
 * site to update. Returns an uppercase ISO-3166 alpha-2 code, or null when
 * the header is absent (local dev, non-Vercel, or geo unavailable).
 */
export function getRequestCountry(headers: Headers): string | null {
  const raw = headers.get('x-vercel-ip-country');
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
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
