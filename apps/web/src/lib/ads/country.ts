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
 * `target_countries` allow-list.
 *
 * - empty / null allow-list → global, shows everywhere.
 * - non-empty allow-list → shows only if the visitor's country is known AND
 *   listed. When the country is unknown (null), a *restricted* creative is
 *   withheld (fail closed — never show a JP-only ad to an unknown geo),
 *   while global creatives still show.
 */
export function creativeAllowedInCountry(
  targetCountries: readonly string[] | null | undefined,
  country: string | null
): boolean {
  if (!targetCountries || targetCountries.length === 0) return true;
  if (!country) return false;
  return targetCountries.includes(country);
}

export function filterByCountry<T extends { targetCountries: string[] | null }>(
  creatives: readonly T[],
  country: string | null
): T[] {
  return creatives.filter((c) => creativeAllowedInCountry(c.targetCountries, country));
}
